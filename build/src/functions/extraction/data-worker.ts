import { ExtractorEventType, NormalizedItem, processTask, RepoInterface } from '@devrev/ts-adaas';
import { WrikeApiClient, WrikeContact, WrikeTask } from './wrike-api-client';

/**
 * Worker for handling data extraction
 * This worker is responsible for:
 * 1. Fetching contacts from Wrike API
 * 2. Fetching tasks for the specific project from Wrike API
 * 3. Pushing the data to repositories
 * 4. Emitting a single EXTRACTION_DATA_DONE event
 */
processTask({
  task: async ({ adapter }) => {
    // Flags to track state
    let eventEmitted = false;

    try {
      console.log('Data extraction worker started with event type:', adapter.event.payload?.event_type);
      
      const event = adapter.event;
      
      // Extract the Wrike API key, Space ID, and Project ID
      const apiKey = event.payload.connection_data.key;
      // Use the space ID from connection_data.org_id for contacts
      const spaceId = event.payload.connection_data.org_id;
      const projectId = event.payload.event_context.external_sync_unit_id;
      
      if (!apiKey) {
        throw new Error('Missing API key in connection_data');
      }
      
      if (!spaceId || spaceId === '') {
        throw new Error('Missing Space ID in connection_data');
      }
      
      if (!projectId) {
        throw new Error('Missing Project ID in event_context.external_sync_unit_id');
      }
      
      // Create a new Wrike API client
      const apiClient = new WrikeApiClient(apiKey);
      
      // Initialize repositories for users and tasks
      adapter.initializeRepos([
        {
          itemType: 'users',
          normalize: (record: object) => normalizeContact(record as WrikeContact)
        },
        {
          itemType: 'tasks',
          normalize: (record: object) => normalizeTask(record as WrikeTask)
        }
      ]);
      
      // Get repositories
      const usersRepo = adapter.getRepo('users');
      if (!usersRepo) {
        console.error('Failed to get users repository');
      }
      
      const tasksRepo = adapter.getRepo('tasks');
      if (!tasksRepo) {
        throw new Error('Failed to get tasks repository');
      }
      
      // Step 1: Try to fetch contacts (users) - use spaceId from connection_data.org_id
      console.log('Fetching contacts from Wrike API');
      try {
        const contacts = await apiClient.fetchContacts(spaceId);
        console.log(`Fetched ${contacts.length} contacts`);

        // Push contacts to the users repository if we have any
        if (contacts.length > 0 && usersRepo) {
          console.log('Pushing contacts to users repository');
          try {
            const pushResult = await usersRepo.push(contacts);
            if (!pushResult) {
              const errorMsg = 'Failed to push contacts to repository';
              console.error(errorMsg);
              // Emit an error event for contact push failure
              if (!eventEmitted) {
                await adapter.emit(ExtractorEventType.ExtractionDataError, {
                  error: { message: `Error pushing contacts: ${errorMsg}` }
                });
                eventEmitted = true;
                return; // Exit early since we've already emitted an error
              }
            } else {
              console.log('Successfully pushed contacts to users repository');
            }
          } catch (error) {
            console.error(`Error pushing contacts: ${error instanceof Error ? error.message : String(error)}`);
            const errorMsg = `Error pushing contacts: ${error instanceof Error ? error.message : String(error)}`;
            // Emit an error event for contact push failure
            if (!eventEmitted) {
              await adapter.emit(ExtractorEventType.ExtractionDataError, {
                error: { message: errorMsg }
              });
              eventEmitted = true;
              return; // Exit early since we've already emitted an error
            }
          }
        } else {
          // If we don't have any contacts or the repository is not available,
          // log a warning but continue with task processing
          console.log(
            `No contacts to push or repository not available: ${contacts.length} contacts, ` +
            `repository ${usersRepo ? 'available' : 'not available'}`
          );
        }
      } catch (error) {
        // Log the error and emit an error event
        console.error('Error fetching contacts:', error instanceof Error ? error.message : String(error));
        const errorMsg = error instanceof Error 
          ? error.message.startsWith('Error fetching contacts:') 
            ? error.message 
            : `Error fetching contacts: ${error.message}`
          : `Error fetching contacts: ${String(error)}`;
        
        if (!eventEmitted) {
          await adapter.emit(ExtractorEventType.ExtractionDataError, {
            error: { message: errorMsg }
          });
          eventEmitted = true;
          return; // Exit early since we've already emitted an error
        }
      }

      // Only proceed to fetch tasks if no error event has been emitted
      if (!eventEmitted) {
        // Step 2: Fetch tasks for the project
        console.log(`Fetching tasks for project ${projectId} from Wrike API`);
        try {
          const tasks = await apiClient.fetchTasks(projectId);
          console.log(`Fetched ${tasks ? tasks.length : 0} tasks`);
          
          // Push tasks to the tasks repository
          console.log(`Pushing ${tasks.length} tasks to tasks repository`);
          try { 
            await tasksRepo.push(tasks);
            console.log('Successfully pushed tasks to tasks repository');
          } catch (error) {
            console.error('Error pushing tasks to repository:', error instanceof Error ? error.message : String(error));
            const errorMsg = `Error pushing tasks: ${error instanceof Error ? error.message : String(error)}`;

            // Emit an error event for task push failure
            if (!eventEmitted) {
              await adapter.emit(ExtractorEventType.ExtractionDataError, {
                error: { message: errorMsg }
              });
              eventEmitted = true;
              return; // Exit early since we've already emitted an error
            }
          }
        } catch (error) {
          console.error('Error fetching tasks:', error instanceof Error ? error.message : String(error));
          const errorMsg = error instanceof Error 
            ? error.message.startsWith('Error fetching tasks:') 
              ? error.message 
              : `Error fetching tasks: ${error.message}`
            : `Error fetching tasks: ${String(error)}`;

          // Emit an error event for task fetching failure
          if (!eventEmitted) {
            await adapter.emit(ExtractorEventType.ExtractionDataError, {
              error: { message: errorMsg }
            });
            
            eventEmitted = true;
            return; // Exit early since we've already emitted an error
          }
        }
      }
      
      // Step 3: Make sure all data is uploaded (only if no error event has been emitted)
      if (!eventEmitted) {
        try {
          // Upload any remaining items in the users repository
          if (usersRepo) {
            console.log('Uploading any remaining users data if available');
            try {
              const usersResult = await usersRepo.upload();
              if (usersResult) {
                console.error(`Error uploading contacts: ${JSON.stringify(usersResult)}`);
                // Log the error but continue since contact upload failure is not critical
              }
            } catch (uploadError) {
              console.error(`Error uploading contacts: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
              // Log the error but continue since contact upload failure is not critical
            }
          }
          
          // Upload any remaining items in the tasks repository
          console.log('Uploading any remaining tasks data if available');
          try {
            const tasksUploadError = await tasksRepo.upload();
            if (tasksUploadError) {
              console.error(`Error uploading tasks: ${JSON.stringify(tasksUploadError)}`);
              // Emit an error event for task upload failure
              if (!eventEmitted) {
                await adapter.emit(ExtractorEventType.ExtractionDataError, {
                  error: { message: `Error uploading tasks: ${JSON.stringify(tasksUploadError)}` }
                });
                
                eventEmitted = true;
                return; // Exit early since we've already emitted an error
              }
            }
          } catch (uploadError) {
            // Check if this is the "source.on is not a function" error
            const isNonCriticalError = 
              (uploadError instanceof Error && 
              (uploadError.message.includes('source.on is not a function') || 
                uploadError.message.includes('is not a function')));
            
            if (!isNonCriticalError) {
              console.error(`Error uploading tasks: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
              // Emit an error event for task upload failure
              if (!eventEmitted) {
                await adapter.emit(ExtractorEventType.ExtractionDataError, {
                  error: { message: `Error uploading tasks: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}` }
                });
                
                eventEmitted = true;
                return; // Exit early since we've already emitted an error
              }
            } else {
              console.log('Non-critical upload error encountered, continuing with DONE event');
            }
          }
          
          // If we haven't emitted an event yet, emit a success event
          if (!eventEmitted) {
            console.log('Data extraction completed successfully. Emitting DONE event.');
            await adapter.emit(ExtractorEventType.ExtractionDataDone);
            eventEmitted = true;
            console.log('Successfully emitted EXTRACTION_DATA_DONE event');
          }
        } catch (finalError) {
          // Handle any unexpected errors in the final processing
          console.error(`Unexpected error in final processing: ${finalError instanceof Error ? finalError.message : String(finalError)}`);
          
          // If we haven't emitted an event yet, emit an error
          if (!eventEmitted) {
            await adapter.emit(ExtractorEventType.ExtractionDataError, {
              error: { 
                message: `Unexpected error in final processing: ${finalError instanceof Error ? finalError.message : String(finalError)}`
              }
            });
            eventEmitted = true;
          }
        }
      }
    } catch (error) {
      console.error('Error in data extraction worker:', error);

      // Emit an error event if something goes wrong and we haven't emitted an event yet
      if (!eventEmitted) {
        await adapter.emit(ExtractorEventType.ExtractionDataError, {
          error: {
            message: error instanceof Error ? error.message : String(error)
          }
        });
        eventEmitted = true;
      }
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Data extraction worker timed out');
    
    // Emit an error event if the worker times out
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Data extraction timed out'
      },
    });
  },
});

/**
 * Normalizes a Wrike contact into a NormalizedItem
 * @param contact The Wrike contact to normalize
 * @returns A normalized item
 */
function normalizeContact(contact: WrikeContact | any): NormalizedItem {
  return {
    id: contact.id,
    created_date: new Date().toISOString(), // Wrike API doesn't provide creation date for contacts
    modified_date: new Date().toISOString(), // Wrike API doesn't provide modification date for contacts
    data: contact
  };
}

/**
 * Normalizes a Wrike task into a NormalizedItem
 * @param task The Wrike task to normalize
 * @returns A normalized item
 */
function normalizeTask(task: WrikeTask | any): NormalizedItem {
  return {
    id: task.id,
    created_date: task.created_date,
    modified_date: task.updated_date,
    data: task
  };
}