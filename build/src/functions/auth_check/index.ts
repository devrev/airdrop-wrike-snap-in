import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * A function that checks if authentication with the Wrike API works.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A response indicating whether authentication with the Wrike API works
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  auth_successful: boolean,
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
    
    // Extract the Wrike API key
    const apiKey = event.payload.connection_data.key;
    
    // Define the Wrike API endpoint
    const wrikeApiEndpoint = 'https://www.wrike.com/api/v4';
    
    // Log the attempt for debugging purposes
    console.log('Attempting to authenticate with Wrike API');
    
    // Make a GET request to the Wrike API to get contacts
    // This is a simple API call that should work if the API key is valid
    const response = await axios.get(`${wrikeApiEndpoint}/contacts`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000 // 10 seconds timeout
    });

    // Check if the request was successful
    const isSuccessful = response.status >= 200 && response.status < 300;
    
    // Log the response for debugging purposes
    console.log(`Wrike API authentication response status: ${response.status}`);
    
    // Return a success response
    return {
      status: isSuccessful ? 'success' : 'error',
      message: `Authentication check completed with status ${response.status}`,
      auth_successful: isSuccessful,
      error: isSuccessful ? undefined : `Received status code ${response.status}`
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in authentication check function:', error);
    
    // Check if the error is an Axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return {
        status: 'error',
        message: 'Authentication check failed',
        auth_successful: false,
        error: `API request failed with status ${error.response.status}: ${error.message}`
      };
    }
    
    // Return a generic error response
    return {
      status: 'error',
      message: 'Authentication check failed',
      auth_successful: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}