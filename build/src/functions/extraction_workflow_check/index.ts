import { AirdropEvent, EventType } from '@devrev/ts-adaas';

/**
 * A function that checks if the data extraction workflow can be invoked.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A success message indicating the extraction workflow can be invoked
 */
export async function run(events: AirdropEvent[]): Promise<{ status: string, message: string, valid_extraction_events: boolean }> {
  try {
    // Validate input parameters
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    // Validate that each event is a valid AirdropEvent with all required fields
    events.forEach((event, index) => {
      if (!event || typeof event !== 'object') {
        throw new Error(`Invalid event at index ${index}: event must be a valid AirdropEvent object`);
      }
      
      // Check for required fields according to AirdropEvent interface
      if (!event.context) {
        throw new Error(`Invalid event at index ${index}: missing required field 'context'`);
      }
      
      if (!event.context.secrets || !event.context.secrets.service_account_token) {
        throw new Error(`Invalid event at index ${index}: missing required field 'context.secrets.service_account_token'`);
      }
      
      if (!event.context.snap_in_version_id) {
        throw new Error(`Invalid event at index ${index}: missing required field 'context.snap_in_version_id'`);
      }
      
      if (!event.payload) {
        throw new Error(`Invalid event at index ${index}: missing required field 'payload'`);
      }
      
      if (!event.payload.event_context) {
        throw new Error(`Invalid event at index ${index}: missing required field 'payload.event_context'`);
      }
      
      if (!event.execution_metadata || !event.execution_metadata.devrev_endpoint) {
        throw new Error(`Invalid event at index ${index}: missing required field 'execution_metadata.devrev_endpoint'`);
      }
    });

    // Check if any of the events are extraction-related events
    const extractionEventTypes = [
      EventType.ExtractionExternalSyncUnitsStart,
      EventType.ExtractionMetadataStart,
      EventType.ExtractionDataStart,
      EventType.ExtractionDataContinue,
      EventType.ExtractionDataDelete,
      EventType.ExtractionAttachmentsStart,
      EventType.ExtractionAttachmentsContinue,
      EventType.ExtractionAttachmentsDelete
    ];

    const hasExtractionEvents = events.some(event => 
      event.payload && 
      event.payload.event_type && 
      extractionEventTypes.includes(event.payload.event_type)
    );

    // Log the event for debugging purposes
    console.log('Extraction workflow check function invoked with events:', JSON.stringify(events));
    
    // Return a success response
    return {
      status: 'success',
      message: 'Extraction workflow check function successfully invoked',
      valid_extraction_events: hasExtractionEvents
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in extraction workflow check function:', error);
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}