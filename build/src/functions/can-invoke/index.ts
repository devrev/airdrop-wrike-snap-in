/**
 * Function that checks if it can be invoked.
 * 
 * @param events - The events passed to the function
 * @returns An object indicating the function can be invoked
 */
export const canInvoke = async (events: any[]): Promise<{ can_invoke: boolean, message: string }> => {
  try {
    // Log the event for debugging purposes
    console.log('Received events:', JSON.stringify(events));
    
    // Return a simple response indicating the function can be invoked
    return {
      can_invoke: true,
      message: 'Function can be invoked successfully'
    };
  } catch (error) {
    console.error('Error in canInvoke function:', error);
    throw error;
  }
};