import { EventType } from '@devrev/ts-adaas';

/**
 * Function that checks if the data extraction workflow can be invoked.
 * 
 * @param events - The events passed to the function from Airdrop platform
 * @returns An object indicating whether extraction can be invoked
 */
export const canInvokeExtraction = async (events: any[]): Promise<{ can_invoke: boolean; message: string; details?: any }> => {
  try {
    // Log the events for debugging purposes
    console.log('Received events for extraction validation:', JSON.stringify(events));
    
    if (!events || events.length === 0) {
      return {
        can_invoke: false,
        message: 'No events provided'
      };
    }

    const event = events[0];
    
    // Check if the event has the necessary structure for extraction
    if (!event.payload || !event.payload.event_type) {
      return {
        can_invoke: false,
        message: 'Event payload or event_type is missing',
        details: { received_event: event }
      };
    }

    // Check if the event type is one of the extraction event types
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

    const isExtractionEvent = extractionEventTypes.includes(event.payload.event_type);
    
    if (!isExtractionEvent) {
      return {
        can_invoke: false,
        message: `Event type ${event.payload.event_type} is not an extraction event type`,
        details: { 
          received_event_type: event.payload.event_type,
          supported_event_types: extractionEventTypes 
        }
      };
    }

    // Check if the event has the necessary context for extraction
    if (!event.context || !event.context.secrets || !event.context.secrets.service_account_token) {
      return {
        can_invoke: false,
        message: 'Event is missing required authentication context',
        details: { missing_fields: 'context.secrets.service_account_token' }
      };
    }

    // If all checks pass, return success
    return {
      can_invoke: true,
      message: 'Extraction workflow can be invoked successfully'
    };
  } catch (error) {
    console.error('Error in canInvokeExtraction function:', error);
    return {
      can_invoke: false,
      message: `Error validating extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};