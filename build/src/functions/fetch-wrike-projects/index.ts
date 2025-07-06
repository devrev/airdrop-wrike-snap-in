import { WrikeClient } from '../../core/wrike-client';

/**
 * Function that fetches the list of projects from Wrike.
 * 
 * @param events - The events passed to the function
 * @returns An object containing the list of projects or error information
 */
export const fetch_wrike_projects = async (events: any[]): Promise<{ success: boolean; message: string; projects?: any[]; details?: any }> => {
  // Initialize spaceId for use in catch block
  let spaceIdForError = '';
  
  try {
    // Log the events for debugging purposes
    console.log('Received events for fetching Wrike projects:', JSON.stringify(events));
    
    if (!events || events.length === 0) {
      return {
        success: false,
        message: 'No events provided'
      };
    }

    const event = events[0];
    
    // Check if the event has the necessary structure
    if (!event.payload || !event.payload.connection_data) {
      return {
        success: false,
        message: 'Event payload or connection_data is missing',
        details: { received_event: event }
      };
    }

    // Extract the Wrike API key and Space ID
    const apiKey = event.payload.connection_data.key;
    const spaceId = event.payload.connection_data.org_id;
    // Update spaceIdForError with actual value
    spaceIdForError = spaceId;
    
    if (!apiKey) {
      return {
        success: false,
        message: 'Wrike API key is missing in connection_data',
        details: { connection_data: event.payload.connection_data }
      };
    }

    if (!spaceId) {
      return {
        success: false,
        message: 'Space ID is missing in connection_data',
        details: { connection_data: event.payload.connection_data }
      };
    }

    // Create a Wrike client and fetch projects
    const wrikeClient = new WrikeClient(apiKey);
    const projects = await wrikeClient.getProjects(spaceId);
    if (!projects || projects.length === 0) console.log(`No projects found in space ${spaceId}`);
    
    return {
      success: true,
      message: `Successfully fetched ${projects.length} projects from Wrike`,
      projects: projects
    };
  } catch (error) {
    console.error('Error in fetch_wrike_projects function:', error);
    
    // Check if the error is related to an invalid space ID
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isResourceNotFoundError = errorMessage.includes('Resource not found') || 
                                   errorMessage.includes('404');

    const message = isResourceNotFoundError 
      ? `Invalid space ID: ${spaceIdForError}` 
      : `Error fetching Wrike projects: ${errorMessage}`;
    
    return {
      success: false,
      message,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};