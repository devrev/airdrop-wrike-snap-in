import { WrikeClient } from '../../core/wrike-client';

/**
 * Function that checks if authentication with the Wrike API works.
 * 
 * @param events - The events passed to the function
 * @returns An object indicating whether authentication was successful
 */
export const check_wrike_auth = async (events: any[]): Promise<{ authenticated: boolean; message: string; details?: any }> => {
  try {
    // Log the events for debugging purposes
    console.log('Received events for Wrike authentication check:', JSON.stringify(events));
    
    if (!events || events.length === 0) {
      return {
        authenticated: false,
        message: 'No events provided'
      };
    }

    const event = events[0];
    
    // Check if the event has the necessary structure
    if (!event.payload || !event.payload.connection_data) {
      return {
        authenticated: false,
        message: 'Event payload or connection_data is missing',
        details: { received_event: event }
      };
    }

    // Extract the Wrike API key
    const apiKey = event.payload.connection_data.key;
    
    if (!apiKey) {
      return {
        authenticated: false,
        message: 'Wrike API key is missing in connection_data',
        details: { connection_data: event.payload.connection_data }
      };
    }

    // Create a Wrike client and test authentication
    const wrikeClient = new WrikeClient(apiKey);
    const authResult = await wrikeClient.testAuthentication();
    
    return {
      authenticated: authResult.success,
      message: authResult.message,
      details: authResult.details
    };
  } catch (error) {
    console.error('Error in check_wrike_auth function:', error);
    return {
      authenticated: false,
      message: `Error checking Wrike authentication: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};