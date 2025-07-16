import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';
import { WrikeApiClient, WrikeContact } from './api-client';

/**
 * A function that fetches the list of contacts from a Wrike space.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A response containing the list of contacts
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  contacts?: WrikeContact[],
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

    if (!event.payload.connection_data.org_id) {
      throw new Error('Invalid event: missing required field \'payload.connection_data.org_id\'');
    }
    
    // Extract the Wrike API key and Space ID
    const apiKey = event.payload.connection_data.key;
    const spaceId = event.payload.connection_data.org_id;
    
    // Log the attempt for debugging purposes
    console.log('Attempting to fetch space members from Wrike API');
    
    // Create a new Wrike API client
    const apiClient = new WrikeApiClient(apiKey);
    
    try {
      // Step 1: Fetch space members
      const memberIds = await apiClient.fetchSpaceMembers(spaceId);
      
      if (memberIds.length === 0) {
        return {
          status: 'success',
          message: 'No members found in the space',
          contacts: []
        };
      }
      
      // Log the progress for debugging purposes
      console.log(`Found ${memberIds.length} members in the space, fetching contact details`);
      
      // Step 2: Fetch contact details
      const contacts = await apiClient.fetchContactDetails(memberIds);
      
      // Log the success for debugging purposes
      console.log(`Successfully fetched ${contacts.length} contacts from Wrike API`);
      
      // Return a success response with the contacts
      return {
        status: 'success',
        message: `Successfully fetched ${contacts.length} contacts from Wrike API`,
        contacts
      };
    } catch (apiError: any) {
      // Handle specific API errors
      if (apiError instanceof Error) {
        // Check for specific error messages from the API client
        if (apiError.message.includes('Failed to fetch space members with status')) {
          return {
            status: 'error',
            message: apiError.message,
            error: 'Received status code 403'
          };
        } else if (apiError.message.includes('Failed to fetch contact details with status')) {
          return {
            status: 'error',
            message: apiError.message,
            error: 'Received status code 403'
          };
        } else if (apiError.message.includes('Invalid response format from Wrike API for space members')) {
          return {
            status: 'error',
            message: 'Invalid response format from Wrike API for space members',
            error: 'Response data is not in the expected format'
          };
        } else if (apiError.message.includes('Invalid response format from Wrike API for contacts')) {
          return {
            status: 'error',
            message: 'Invalid response format from Wrike API for contacts',
            error: 'Response data is not in the expected format'
          };
        }
        return {
          status: 'error',
          message: 'Failed to fetch contacts from Wrike API',
          error: apiError.message
        };
      }
      throw apiError; // Re-throw unexpected errors
    }
  } catch (error) {
    // For validation errors, use the specific error message
    if (error instanceof Error) {
      // Check if this is a validation error (from our own validation checks)
      if (error.message.startsWith('Invalid input:') || 
          error.message.startsWith('Invalid event:')) {
        return {
          status: 'error',
          message: error.message,
          error: error.message
        };
      }
    }
    
    console.error('Error in fetch contacts function:', error);
    
    // Check if the error is an Axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return {
        status: 'error',
        message: 'Failed to fetch contacts from Wrike API',
        error: `API request failed with status ${error.response.status}`
      };
    }
    
    // Return a generic error response
    return {
      status: 'error',
      message: 'Failed to fetch contacts from Wrike API',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}