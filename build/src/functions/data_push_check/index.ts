import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * A function that checks if pushing data to the callback URL works.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A response indicating whether the data push was successful
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  push_successful: boolean,
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
    
    if (!event.context.snap_in_version_id) {
      throw new Error('Invalid event: missing required field \'context.snap_in_version_id\'');
    }
    
    if (!event.payload) {
      throw new Error('Invalid event: missing required field \'payload\'');
    }
    
    if (!event.payload.event_context) {
      throw new Error('Invalid event: missing required field \'payload.event_context\'');
    }

    if (!event.payload.event_context.callback_url) {
      throw new Error('Invalid event: missing required field \'payload.event_context.callback_url\'');
    }
    
    if (!event.execution_metadata || !event.execution_metadata.devrev_endpoint) {
      throw new Error('Invalid event: missing required field \'execution_metadata.devrev_endpoint\'');
    }

    // Extract the callback URL
    const callbackUrl = event.payload.event_context.callback_url;
    
    // Create a test payload
    const testPayload = {
      test_data: 'This is a test payload',
      timestamp: new Date().toISOString(),
      snap_in_version_id: event.context.snap_in_version_id
    };

    // Log the attempt for debugging purposes
    console.log(`Attempting to push data to callback URL: ${callbackUrl}`);
    
    // Make a POST request to the callback URL
    const response = await axios.post(callbackUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': event.context.secrets.service_account_token
      },
      timeout: 10000 // 10 seconds timeout
    });

    // Check if the request was successful
    const isSuccessful = response.status >= 200 && response.status < 300;
    
    // Log the response for debugging purposes
    console.log(`Data push response status: ${response.status}`);
    
    // Return a success response
    return {
      status: isSuccessful ? 'success' : 'error',
      message: `Data push check function completed with status ${response.status}`,
      push_successful: isSuccessful,
      error: isSuccessful ? undefined : `Received status code ${response.status}`
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in data push check function:', error);
    
    // Return an error response
    return {
      status: 'error',
      message: 'Data push check function failed',
      push_successful: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}