import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * Interface for a Wrike task
 */
export interface WrikeTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  importance: string;
  created_date: string;
  updated_date: string;
  completed_date?: string;
  due_date?: string;
  parent_ids: string[];
  responsible_ids?: string[];
  author_ids?: string[];
  custom_status_id?: string;
  permalink?: string;
}

/**
 * A function that fetches the list of tasks for a specific project from Wrike API.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A response containing the list of tasks
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  tasks?: WrikeTask[],
  error?: string
}> {
  try {
    // Validate input parameters
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    if (events.length === 0) {
      throw new Error('Invalid input: events array is empty');
    }

    // Use the first event for the check
    const event = events[0];

    // Validate that the event is a valid AirdropEvent with all required fields
    if (!event || typeof event !== 'object') {
      throw new Error('Invalid event: event must be a valid AirdropEvent object');
    }
    
    // Check for required fields according to AirdropEvent interface
    if (!event.context) {
      throw new Error('Invalid event: missing required field \'context\'');
    }
    
    if (!event.context.secrets || !event.context.secrets.service_account_token) {
      throw new Error('Invalid event: missing required field \'context.secrets.service_account_token\'');
    }
    
    if (!event.payload) {
      throw new Error('Invalid event: missing required field \'payload\'');
    }
    
    if (!event.payload.connection_data) {
      throw new Error('Invalid event: missing required field \'payload.connection_data\'');
    }

    if (!event.payload.connection_data.key) {
      throw new Error('Invalid event: missing required field \'payload.connection_data.key\'');
    }

    if (!event.payload.event_context) {
      throw new Error('Invalid event: missing required field \'payload.event_context\'');
    }

    if (!event.payload.event_context.external_sync_unit_id) {
      throw new Error('Invalid event: missing required field \'payload.event_context.external_sync_unit_id\'');
    }
    
    // Extract the Wrike API key and Project ID
    const apiKey = event.payload.connection_data.key;
    const projectId = event.payload.event_context.external_sync_unit_id;
    
    // Define the Wrike API endpoint
    const wrikeApiEndpoint = 'https://www.wrike.com/api/v4';
    
    // Log the attempt for debugging purposes
    console.log(`Attempting to fetch tasks for project ${projectId} from Wrike API`);
    
    // Make a GET request to the Wrike API to get tasks for the project
    // According to the Postman collection, we should use the /folders/{projectId}/tasks endpoint
    const response = await axios.get(`${wrikeApiEndpoint}/folders/${projectId}/tasks`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      params: {
        descendants: true,
        subTasks: true
      },
      timeout: 10000 // 10 seconds timeout
    });

    // Check if the request was successful
    if (response.status !== 200) {
      return {
        status: 'error',
        message: `Failed to fetch tasks with status ${response.status}`,
        error: `Received status code ${response.status}`
      };
    }
    
    // Process the response data
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      return {
        status: 'error',
        message: 'Invalid response format from Wrike API',
        error: 'Response data is not in the expected format'
      };
    }
    
    // Transform the response data into our task format
    const tasks: WrikeTask[] = response.data.data.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        importance: task.importance,
        created_date: task.createdDate || '',
        updated_date: task.updatedDate || '',
        completed_date: task.completedDate,
        due_date: task.dueDate,
        parent_ids: task.parentIds || [],
        responsible_ids: task.responsibleIds,
        author_ids: task.authorIds,
        custom_status_id: task.customStatusId,
        permalink: task.permalink
    }));
    
    // Log the success for debugging purposes
    console.log(`Successfully fetched ${tasks.length} tasks from Wrike API for project ${projectId}`);
    
    // Return a success response with the tasks
    return {
      status: 'success',
      message: `Successfully fetched ${tasks.length} tasks from project ${projectId}`,
      tasks
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in fetch tasks function:', error);
    
    // Check if the error is an Axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return {
        status: 'error',
        message: 'Failed to fetch tasks from Wrike API',
        error: `API request failed with status ${error.response.status}: ${error.message}`
      };
    }
    
    // Return a generic error response
    return {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}