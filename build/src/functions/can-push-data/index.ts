import axios from 'axios';

/**
 * Function that checks if pushing data to the callback URL works.
 * 
 * @param events - The events passed to the function from Airdrop platform
 * @returns An object indicating whether data pushing works
 */
export const canPushData = async (events: any[]): Promise<{ can_push: boolean; message: string; details?: any }> => {
  try {
    // Log the events for debugging purposes
    console.log('Received events for data push validation:', JSON.stringify(events));
    
    if (!events || events.length === 0) {
      return {
        can_push: false,
        message: 'No events provided'
      };
    }

    const event = events[0];
    
    // Check if the event has the necessary structure for pushing data
    if (!event.payload || !event.payload.event_context || !event.payload.event_context.callback_url) {
      return {
        can_push: false,
        message: 'Event payload or callback_url is missing',
        details: { received_event: event }
      };
    }

    const callbackUrl = event.payload.event_context.callback_url;
    
    // Create a simple test payload
    const testPayload = {
      test_data: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test payload to verify data pushing capability'
    };

    // Attempt to push data to the callback URL
    try {
      const response = await axios.post(callbackUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      // Check if the request was successful
      if (response.status >= 200 && response.status < 300) {
        return {
          can_push: true,
          message: `Successfully pushed data to callback URL: ${callbackUrl}`,
          details: {
            status_code: response.status,
            response_data: response.data
          }
        };
      } else {
        return {
          can_push: false,
          message: `Received non-success status code when pushing data: ${response.status}`,
          details: {
            status_code: response.status,
            response_data: response.data
          }
        };
      }
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        return {
          can_push: false,
          message: `Failed to push data to callback URL: ${error.message}`,
          details: {
            error_code: error.code,
            error_message: error.message,
            response: error.response?.data
          }
        };
      } else {
        throw error; // Re-throw if it's not an axios error
      }
    }
  } catch (error) {
    console.error('Error in canPushData function:', error);
    return {
      can_push: false,
      message: `Error validating data push: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};