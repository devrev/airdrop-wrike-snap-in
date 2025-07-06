import { ExtractorEventType, NormalizedItem, processTask } from '@devrev/ts-adaas';

// Define the state type for the extraction process
type ExtractorState = {
  users: {
    completed: boolean;
  };
  tasks: {
    completed: boolean;
  };
};

// Process the data extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Starting data extraction test');

    // Initialize repositories for different types of data
    const repos = [
      {
        itemType: 'users',
        normalize: (user: any): NormalizedItem => ({
          id: user.id,
          created_date: user.created_at,
          modified_date: user.updated_at,
          data: {
            name: user.name,
            email: user.email,
            role: user.role
          }
        })
      },
      {
        itemType: 'tasks',
        normalize: (task: any): NormalizedItem => ({
          id: task.id,
          created_date: task.created_at,
          modified_date: task.updated_at,
          data: {
            title: task.title,
            description: task.description,
            status: task.status,
            assignee: task.assignee,
            item_url_field: `https://example.com/tasks/${task.id}`
          }
        })
      }
    ];

    adapter.initializeRepos(repos);

    // Generate sample user data
    const users = [
      {
        id: 'user-1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin'
      },
      {
        id: 'user-2',
        created_at: '2023-01-03T00:00:00Z',
        updated_at: '2023-01-04T00:00:00Z',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user'
      }
    ];

    // Generate sample task data
    const tasks = [
      {
        id: 'task-1',
        created_at: '2023-02-01T00:00:00Z',
        updated_at: '2023-02-02T00:00:00Z',
        title: 'Implement feature X',
        description: 'Implement the new feature X as described in the spec',
        status: 'in_progress',
        assignee: 'user-1'
      },
      {
        id: 'task-2',
        created_at: '2023-02-03T00:00:00Z',
        updated_at: '2023-02-04T00:00:00Z',
        title: 'Fix bug Y',
        description: 'Fix the bug Y that occurs when user does Z',
        status: 'todo',
        assignee: 'user-2'
      }
    ];

    // Push data to repositories
    await adapter.getRepo('users')?.push(users);
    adapter.state.users.completed = true;

    await adapter.getRepo('tasks')?.push(tasks);
    adapter.state.tasks.completed = true;

    // Emit the completion event
    await adapter.emit(ExtractorEventType.ExtractionDataDone);

    console.log('Data extraction test completed successfully');
  },
  onTimeout: async ({ adapter }) => {
    console.error('Data extraction test timed out');
    
    // Emit an error event if the task times out
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Data extraction test timed out. Lambda timeout.'
      }
    });
  }
});