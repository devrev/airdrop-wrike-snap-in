import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import path from 'path';
import initialDomainMapping from '../generate_initial_mapping/initial_domain_mapping.json';

/**
 * A function that checks if the data extraction workflow can be invoked.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns A response indicating whether the data extraction workflow can be invoked
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  valid_data_extraction_events: boolean 
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

    // Check if any of the events are data extraction events
    const dataExtractionEventTypes = [
      EventType.ExtractionDataStart,
      EventType.ExtractionDataContinue
    ];

    const hasDataExtractionEvents = events.some(event => 
      event.payload && 
      event.payload.event_type && 
      dataExtractionEventTypes.includes(event.payload.event_type)
    );

    // Log the event for debugging purposes
    console.log('Data extraction check function invoked with events:', JSON.stringify(events));
    
    // Filter events to only include data extraction events (ExtractionDataStart or ExtractionDataContinue)
    const dataExtractionEvents = events.filter(event => 
      event.payload && 
      event.payload.event_type &&
      dataExtractionEventTypes.includes(event.payload.event_type)
    );

    // For each data extraction event, spawn a worker to process it
    for (const event of dataExtractionEvents) {
      // Define the worker path - make sure to use .ts extension as required by the SDK  
      const workerPath = path.resolve(__dirname, 'worker.ts');

      // Define initial state for the worker
      const initialState = {};

      console.log(`Spawning worker for event type: ${event.payload.event_type}`);
      // Spawn the worker to process the event - note: no options key in the parameter object
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
    
    // Return a response
    return {
      status: 'success',
      message: 'Data extraction check function successfully invoked',
      valid_data_extraction_events: hasDataExtractionEvents
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in data extraction check function:', error);
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}