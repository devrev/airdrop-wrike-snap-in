import { WrikeClient } from '../../core/wrike-client';

/**
 * Function that fetches the list of tasks from a Wrike project.
 * 
 * @param events - The events passed to the function
 * @returns An object containing the list of tasks or error information
 */
export const fetch_wrike_tasks = async (events: any[]): Promise<{ success: boolean; message: string; tasks?: any[]; details?: any }> => {
  // Initialize projectId for use in catch block
  let projectIdForError = '';
  
  try {
    // Log the events for debugging purposes
    console.log('Received events for fetching Wrike tasks:', JSON.stringify(events));
    
    if (!events || events.length === 0) {
      return {
        success: false,
        message: 'No events provided'
      };
    }

    const event = events[0];
    
    // Check if the event has the necessary structure
    if (!event.payload || !event.payload.connection_data) {
      return {
        success: false,
        message: 'Event payload or connection_data is missing',
        details: { received_event: event }
      };
    }

    // Check if the event has the event_context with external_sync_unit_id
    if (!event.payload.event_context) {
      return {
        success: false,
        message: 'Event context or external_sync_unit_id is missing',
        details: { received_event: event }
      };
    }

    // Extract the Wrike API key and Project ID
    const apiKey = event.payload.connection_data.key;
    const projectId = event.payload.event_context.external_sync_unit_id;
    // Update projectIdForError with actual value
    projectIdForError = projectId;
    
    if (!apiKey) {
      return {
        success: false,
        message: 'Wrike API key is missing in connection_data',
        details: { connection_data: event.payload.connection_data }
      };
    }

    if (!projectId) {
      return {
        success: false,
        message: 'Project ID is missing in event_context.external_sync_unit_id',
        details: { event_context: event.payload.event_context }
      };
    }

    // Create a Wrike client and fetch tasks
    const wrikeClient = new WrikeClient(apiKey);
    const tasks = await wrikeClient.getProjectTasks(projectId);
    
    return {
      success: true,
      message: `Successfully fetched ${tasks.length} tasks from Wrike project`,
      tasks: tasks
    };
  } catch (error) {
    console.error('Error in fetch_wrike_tasks function:', error);
    
    // Check if the error is related to an invalid project ID
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isResourceNotFoundError = errorMessage.includes('Resource not found') || 
                                   errorMessage.includes('404') ||
                                   errorMessage.includes('Invalid project ID format') ||
                                   errorMessage.includes('invalid_request') ||
                                   errorMessage.includes('Invalid request') ||
                                   errorMessage.includes('Project ID is required');
    
    const message = isResourceNotFoundError 
      ? `Invalid project ID: ${projectIdForError}` 
      : `Error fetching Wrike tasks: ${errorMessage}`;
    
    return {
      success: false,
      message,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};