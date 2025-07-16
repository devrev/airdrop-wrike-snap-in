import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * Interface for a Wrike project
 */
interface WrikeProject {
  id: string;
  title: string;
  description?: string;
  created_date: string;  // Using snake_case as required
  updated_date: string;  // Using snake_case as required
  scope: string;
  project_status?: string;
  custom_status_id?: string;
  parent_ids?: string[];
  shared?: boolean;
  permalink?: string;
}

/**
 * A function that fetches the list of projects from Wrike API.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A response containing the list of projects
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  projects?: WrikeProject[],
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
    
    // Extract the Wrike API key and Space ID
    const apiKey = event.payload.connection_data.key;
    const spaceId = event.payload.connection_data.org_id;
    
    // Define the Wrike API endpoint
    const wrikeApiEndpoint = 'https://www.wrike.com/api/v4';
    
    // Log the attempt for debugging purposes
    console.log('Attempting to fetch projects from Wrike API');
    
    // Make a GET request to the Wrike API to get folders/projects
    // According to the Postman collection, we should use the /folders endpoint
    const response = await axios.get(`${wrikeApiEndpoint}/spaces/${spaceId}/folders`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      params: {
        descendants: true
      },
      timeout: 10000 // 10 seconds timeout
    });

    // Check if the request was successful
    if (response.status !== 200) {
      return {
        status: 'error',
        message: `Failed to fetch projects with status ${response.status}`,
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
    
    // Transform the response data into our project format
    const projects: WrikeProject[] = response.data.data.map((project: any) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        created_date: project.createdDate || '',
        updated_date: project.updatedDate || '',
        scope: project.scope,
        project_status: project.project ? project.project.status : undefined,
        custom_status_id: project.customStatusId,
        parent_ids: project.parentIds,
        shared: project.shared,
        permalink: project.permalink
    }));
    
    // Log the success for debugging purposes
    console.log(`Successfully fetched ${projects.length} projects from Wrike API`);
    
    // Return a success response with the projects
    return {
      status: 'success',
      message: `Successfully fetched ${projects.length} projects from Wrike API`,
      projects
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in fetch projects function:', error);
    
    // Check if the error is an Axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return {
        status: 'error',
        message: 'Failed to fetch projects from Wrike API',
        error: `API request failed with status ${error.response.status}: ${error.message}`
      };
    }
    
    // Return a generic error response
    return {
      status: 'error',
      message: 'Failed to fetch projects from Wrike API',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}