import { CallbackData } from './types';

/**
 * Helper function to determine the type of callback based on path and content
 */
export function determineCallbackType(path: string, data: any): string {
  // Check if this is an event callback
  if (data && data.event_type) {
    return 'event';
  }
  
  // Check if this is a worker data update
  if (path.includes('worker-data')) {
    return 'worker-data';
  }
  
  // Check if this contains user or task data
  if (data && Array.isArray(data)) {
    // Look for indicators of user data
    const hasUserData = data.some(item => 
      item.email !== undefined || 
      item.first_name !== undefined || 
      item.last_name !== undefined ||
      item.full_name !== undefined
    );
    
    if (hasUserData) {
      return 'users';
    }
    
    // Look for indicators of task data
    const hasTaskData = data.some(item => 
      item.title !== undefined && 
      (item.status !== undefined || item.description !== undefined)
    );
    
    if (hasTaskData) {
      return 'tasks';
    }
  }
  
  // If we can't determine a specific type, consider it generic data
  return 'data';
}

/**
 * Helper function to wait for callbacks
 */
export async function waitForCallbacks(callbacks: CallbackData[], timeout: number): Promise<void> {
  const startTime = Date.now();
  
  // Check if we've received a completion event (either success or error)
  while (Date.now() - startTime < timeout) {
    const completionEvent = callbacks.find((cb: CallbackData) => 
      cb.type === 'event' && 
      cb.data && 
      (cb.data.event_type === 'EXTRACTION_DATA_DONE' || cb.data.event_type === 'EXTRACTION_DATA_ERROR')
    );
    
    if (completionEvent) {
      console.log(`Received completion event: ${completionEvent.data.event_type} at ${completionEvent.timestamp.toISOString()}`);
      
      // Wait an additional 5 seconds to catch any duplicate events
      await new Promise(resolve => setTimeout(resolve, 5000));
      return;
    }
    
    // Wait for 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log progress every 10 seconds
    if ((Date.now() - startTime) % 10000 < 1000) {
      console.log(`Still waiting for completion event... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
      console.log(`Received ${callbacks.length} callbacks so far`);
    }
  }
  
  // If we get here, we've timed out
  console.log('Timed out waiting for completion event');
}

/**
 * Helper function to check if an error is related to API authentication or invalid request
 */
export function isApiAuthError(errorMessage: string): boolean {
  return (
    errorMessage.includes('invalid_request') || 
    errorMessage.includes('authentication') || 
    errorMessage.includes('authorization') ||
    errorMessage.includes('Invalid') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403')
  );
}