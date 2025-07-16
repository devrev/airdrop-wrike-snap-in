import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import path from 'path';
import initialDomainMapping from '../generate_initial_mapping/initial_domain_mapping.json';

/**
 * A function that extracts data from Wrike and pushes it to DevRev.
 * If the event type is EXTRACTION_EXTERNAL_SYNC_UNITS_START, it will
 * fetch projects from Wrike and push them as external sync units.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A response indicating the status of the extraction
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string 
}> {
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

    // Filter events to only include EXTRACTION_EXTERNAL_SYNC_UNITS_START events
    const externalSyncUnitsEvents = events.filter(event => 
      event.payload &&
      event.payload.event_type === EventType.ExtractionExternalSyncUnitsStart
    );

    // Log the event for debugging purposes
    console.log(`Extraction function invoked with ${events.length} events, ${externalSyncUnitsEvents.length} are external sync units events`);
    
    // For each external sync units event, spawn a worker to process it
    for (const event of externalSyncUnitsEvents) {
      // Define the worker path - make sure to use .ts extension as required by the SDK
      const workerPath = path.resolve(__dirname, 'worker.ts');
      
      // Define initial state for the worker
      const initialState = {};
      
      // Spawn the worker to process the event
      await spawn({
        event: {
          ...event,
          payload: { ...event.payload }
        },
        initialDomainMapping,
        initialState,
        workerPath
      });
    }

    // Filter events to only include EXTRACTION_METADATA_START events
    const metadataEvents = events.filter(event => 
      event.payload && 
      event.payload.event_type === EventType.ExtractionMetadataStart
    );

    // Log the metadata events for debugging purposes
    console.log(`Found ${metadataEvents.length} metadata events`);
    
    // For each metadata event, spawn a worker to process it
    for (const event of metadataEvents) {
      // Define the worker path - make sure to use .ts extension as required by the SDK
      const workerPath = path.resolve(__dirname, 'metadata-worker.ts');
      
      // Define initial state for the worker
      const initialState = {};
      
      // Spawn the worker to process the event
      await spawn({
        event: {
          ...event,
          payload: { ...event.payload }
        },
        initialDomainMapping,
        initialState,
        workerPath
      });
    }

    // Filter events to only include EXTRACTION_DATA_START events
    const dataEvents = events.filter(event => 
      event.payload && 
      event.payload.event_type === EventType.ExtractionDataStart
    );

    // Log the data events for debugging purposes
    console.log(`Found ${dataEvents.length} data extraction events`);
    
    // For each data event, spawn a worker to process it
    for (const event of dataEvents) {
      // Define the worker path - make sure to use .ts extension as required by the SDK
      const workerPath = path.resolve(__dirname, 'data-worker.ts');
      
      // Define initial state for the worker
      const initialState = {};
      
      // Spawn the worker to process the event
      await spawn({
        event,
        initialDomainMapping,
        initialState,
        workerPath
      });
    }

    const attachmentsEvents = events.filter(event => 
      event.payload && 
      event.payload.event_type === EventType.ExtractionAttachmentsStart
    );

    for (const event of attachmentsEvents) {
      // Define the worker path for attachments
      const workerPath = path.resolve(__dirname, 'attachments-worker.ts');
      
      // Define initial state for the worker
      const initialState = {};
      
      // Spawn the worker to process the event
      await spawn({
        event,
        initialDomainMapping,
        initialState,
        workerPath
      });      
    }
    
    // Return a success response that includes both types of events
    return {
      status: 'success',
      message: `Extraction function successfully processed ${externalSyncUnitsEvents.length} external sync units events`
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in extraction function:', error);
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}