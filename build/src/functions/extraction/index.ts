import { EventType, spawn } from '@devrev/ts-adaas';
import { readInitialDomainMapping } from '../../core/domain-mapping-utils';
import { 
  getEventTypeDescription,
  handleAttachmentsExtraction, 
  handleDataExtraction, 
  handleExternalSyncUnitsExtraction, 
  handleMetadataExtraction, 
  validateConnectionData, 
  validateExternalSyncUnitId 
} from './event-handlers';

/**
 * Function that handles extraction events from Airdrop platform.
 * Currently supports EXTRACTION_EXTERNAL_SYNC_UNITS_START, EXTRACTION_METADATA_START, EXTRACTION_DATA_START, EXTRACTION_ATTACHMENTS_START, and EXTRACTION_ATTACHMENTS_CONTINUE event types.
 * 
 * @param events - The events passed to the function
 * @returns An object indicating whether the extraction was successful
 */
export const extraction = async (events: any[]): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    // Log the events for debugging purposes
    console.log('Received events for extraction:', 
      JSON.stringify(events, null, 2).substring(0, 1000) + (JSON.stringify(events).length > 1000 ? '...' : ''));
    
    if (!events || events.length === 0) {
      return {
        success: false,
        message: 'No events provided'
      };
    }

    const event = events[0];
    
    // Check if the event has the necessary structure
    if (!event.payload || !event.payload.event_type) {
      return {
        success: false,
        message: 'Event payload or event_type is missing',
        details: { received_event: event }
      };
    }

    // Check if the event has the necessary context
    if (!event.context || !event.context.secrets || !event.context.secrets.service_account_token) {
      return {
        success: false,
        message: 'Event is missing required authentication context',
        details: { missing_fields: 'context.secrets.service_account_token' }
      };
    }

    // Check if the event type is supported before proceeding
    const supportedEventTypes = [
      EventType.ExtractionExternalSyncUnitsStart,
      EventType.ExtractionMetadataStart,
      EventType.ExtractionDataStart,
      EventType.ExtractionAttachmentsStart,
      EventType.ExtractionAttachmentsContinue
    ];
    
    if (!supportedEventTypes.includes(event.payload.event_type)) {
      return {
        success: false,
        message: 'Unsupported event type',
        details: { 
          event_type: event.payload.event_type,
          supported_event_types: supportedEventTypes
        }
      };
    }

    // For external sync units, we need connection data
    if (event.payload.event_type === EventType.ExtractionExternalSyncUnitsStart || 
        event.payload.event_type === EventType.ExtractionDataStart ||
        event.payload.event_type === EventType.ExtractionAttachmentsStart || 
        event.payload.event_type === EventType.ExtractionAttachmentsContinue) {
      
      const validationResult = validateConnectionData(event);
      if (!validationResult.success) {
        return validationResult;
      }
    }

    // For data extraction, we also need the external_sync_unit_id
    if (event.payload.event_type === EventType.ExtractionDataStart ||
        event.payload.event_type === EventType.ExtractionAttachmentsStart || 
        event.payload.event_type === EventType.ExtractionAttachmentsContinue) {
      
      const validationResult = validateExternalSyncUnitId(event);
      if (!validationResult.success) {
        return validationResult;
      }
    }

    try {
      // Read the initial domain mapping
      const initialDomainMapping = readInitialDomainMapping();

      // Check if domain mapping was successfully read
      if (initialDomainMapping === null) {
        return {
          success: false,
          message: 'Failed to read initial domain mapping',
          details: { error: 'Domain mapping file could not be read' }
        };
      }

      // Handle different event types
      if (event.payload.event_type === EventType.ExtractionExternalSyncUnitsStart) {
        await handleExternalSyncUnitsExtraction(event, initialDomainMapping);
        return {
          success: true,
          message: 'External sync units extraction completed successfully'
        };
      } else if (event.payload.event_type === EventType.ExtractionMetadataStart) {
        await handleMetadataExtraction(event, initialDomainMapping);
        return {
          success: true,
          message: 'Metadata extraction completed successfully'
        };
      } else if (event.payload.event_type === EventType.ExtractionDataStart) {
        await handleDataExtraction(event, initialDomainMapping);
        return {
          success: true,
          message: 'Data extraction completed successfully'
        };
      }
      else if (event.payload.event_type === EventType.ExtractionAttachmentsStart || 
               event.payload.event_type === EventType.ExtractionAttachmentsContinue) {
        await handleAttachmentsExtraction(event, initialDomainMapping);
        return {
          success: true,
          message: 'Attachments extraction completed successfully'
        };
      }

      // This should never happen due to the event type check above
      return {
        success: false,
        message: 'Unsupported event type',
        details: { event_type: event.payload.event_type }
      };
    } catch (error) {
      const eventTypeDescription = getEventTypeDescription(event.payload.event_type);
      
      return {
        success: false,
        message: `Failed to execute ${eventTypeDescription}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.stack : String(error) }
      };
    }
  } catch (error) {
    console.error('Error in extraction function:', error);
    return {
      success: false,
      message: `Error during extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};