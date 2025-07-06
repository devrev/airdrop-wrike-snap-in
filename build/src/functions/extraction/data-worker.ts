import { ExtractorEventType, NormalizedItem, processTask, RepoInterface } from '@devrev/ts-adaas';
import { WrikeClient } from '../../core/wrike-client';

// Define the state type for the data extraction process
type ExtractorState = {
  data: {
    completed: boolean;
    spaceId: string;
    apiKey: string;
    projectId: string;
    users: {
      completed: boolean;
    };
    tasks: {
      completed: boolean;
    };
  };
};

// Process the data extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Starting data extraction');

    try {
      const { spaceId, apiKey, projectId } = adapter.state.data;
      
      if (!spaceId || !apiKey || !projectId) {
        throw new Error('Missing required state parameters: spaceId, apiKey, or projectId');
      }

      // Create a Wrike client
      const wrikeClient = new WrikeClient(apiKey);

      // Initialize repositories for users and tasks
      const repos = [
        {
          itemType: 'users',
          normalize: (user: any): NormalizedItem => ({
            id: user.id,
            created_date: new Date().toISOString(), // Wrike doesn't provide creation date for users
            modified_date: new Date().toISOString(),
            data: user
          })
        },
        {
          itemType: 'tasks',
          normalize: (task: any): NormalizedItem => ({
            id: task.id,
            created_date: task.created_date,
            modified_date: task.updated_date,
            data: task
          })
        }
      ] as RepoInterface[];

      adapter.initializeRepos(repos);

      // Fetch contacts from the space
      console.log(`Fetching contacts from space ${spaceId}...`);
      const contacts = await wrikeClient.getSpaceContacts(spaceId);
      console.log(`Fetched ${contacts.length} contacts from Wrike space`);

      // Push contacts to the users repository
      if (contacts.length > 0) {
        console.log('Pushing contacts to users repository...');
        await adapter.getRepo('users')?.push(contacts);
        console.log('Contacts pushed successfully');
      } else {
        console.log('No contacts to push');
      }

      // Update the state to indicate users are completed
      adapter.state.data.users.completed = true;

      // Fetch tasks from the project
      console.log(`Fetching tasks from project ${projectId}...`);
      const tasks = await wrikeClient.getProjectTasks(projectId);
      console.log(`Fetched ${tasks.length} tasks from Wrike project`);

      // Push tasks to the tasks repository
      if (tasks.length > 0) {
        console.log('Pushing tasks to tasks repository...');
        await adapter.getRepo('tasks')?.push(tasks);
        console.log('Tasks pushed successfully');
      } else {
        console.log('No tasks to push');
      }

      // Update the state to indicate tasks are completed
      adapter.state.data.tasks.completed = true;

      // Update the state to indicate data extraction is completed
      adapter.state.data.completed = true;

      // Emit the completion event
      console.log('Data extraction completed successfully, emitting completion event');
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
      console.log('Successfully emitted completion event');
    } catch (error) {
      console.error('Error during data extraction:', error instanceof Error ? error.message : error);
      
      // Emit an error event with detailed error message
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: `Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Data extraction timed out');
    
    // Emit an error event if the task times out
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Data extraction timed out. Lambda timeout.'
      }
    });
  }
});