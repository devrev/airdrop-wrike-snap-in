import { EventType, spawn } from '@devrev/ts-adaas';
import path from 'path';

/**
 * Handles the external sync units extraction event
 * 
 * @param event - The event to handle
 * @param initialDomainMapping - The initial domain mapping
 * @returns A promise that resolves when the extraction is complete
 */
export async function handleExternalSyncUnitsExtraction(event: any, initialDomainMapping: any): Promise<void> {
  // Initial state for the external sync units extraction process
  const initialState = {
    externalSyncUnits: {
      completed: false,
      spaceId: event.payload.connection_data.org_id,
      apiKey: event.payload.connection_data.key
    }
  };

  // Get the absolute path to the worker file
  const workerPath = path.resolve(__dirname, 'worker.ts');
  
  // Spawn a worker to handle the external sync units extraction
  await spawn({
    event,
    initialDomainMapping,
    initialState,
    workerPath
  });
}

/**
 * Handles the metadata extraction event
 * 
 * @param event - The event to handle
 * @param initialDomainMapping - The initial domain mapping
 * @returns A promise that resolves when the extraction is complete
 */
export async function handleMetadataExtraction(event: any, initialDomainMapping: any): Promise<void> {
  // Initial state for the metadata extraction process
  const initialState = {
    metadata: {
      completed: false,
    }
  };

  // Get the absolute path to the metadata worker file
  const workerPath = path.resolve(__dirname, 'metadata-worker.ts');
  
  // Spawn a worker to handle the metadata extraction
  await spawn({
    event: event,
    initialDomainMapping,
    initialState,
    workerPath
  });
}

/**
 * Handles the data extraction event
 * 
 * @param event - The event to handle
 * @param initialDomainMapping - The initial domain mapping
 * @returns A promise that resolves when the extraction is complete
 */
export async function handleDataExtraction(event: any, initialDomainMapping: any): Promise<void> {
  // Initial state for the data extraction process
  const initialState = {
    data: {
      completed: false,
      spaceId: event.payload.connection_data.org_id,
      apiKey: event.payload.connection_data.key,
      projectId: event.payload.event_context.external_sync_unit_id,
      users: {
        completed: false
      },
      tasks: {
        completed: false
      }
    }
  };

  // Get the absolute path to the data worker file
  const workerPath = path.resolve(__dirname, 'data-worker.ts');
  
  // Spawn a worker to handle the data extraction
  await spawn({
    event,
    initialDomainMapping,
    initialState,
    workerPath
  });
}

/**
 * Handles the attachments extraction event
 * 
 * @param event - The event to handle
 * @param initialDomainMapping - The initial domain mapping
 * @returns A promise that resolves when the extraction is complete
 */
export async function handleAttachmentsExtraction(event: any, initialDomainMapping: any): Promise<void> {
  // Initial state for the attachments extraction process
  const initialState = {
    attachments: {
      completed: false,
      spaceId: event.payload.connection_data.org_id,
      apiKey: event.payload.connection_data.key,
      projectId: event.payload.event_context.external_sync_unit_id
    }
  };

  // Get the absolute path to the attachments worker file
  const workerPath = path.resolve(__dirname, 'attachments-worker.ts');
  
  // Spawn a worker to handle the attachments extraction
  await spawn({
    event,
    initialDomainMapping,
    initialState,
    workerPath
  });
}

/**
 * Validates that the event has the necessary connection data
 * 
 * @param event - The event to validate
 * @returns An object with success status and message
 */
export function validateConnectionData(event: any): { success: boolean; message: string; details?: any } {
  // Check if the event has the necessary connection data
  if (!event.payload.connection_data || !event.payload.connection_data.key || !event.payload.connection_data.org_id) {
    return {
      success: false,
      message: 'Event is missing required connection data',
      details: { 
        missing_fields: !event.payload.connection_data ? 'connection_data' : 
                        !event.payload.connection_data.key ? 'connection_data.key' : 'connection_data.org_id'
      }
    };
  }
  
  return { 
    success: true,
    message: 'Connection data validation successful'
  };
}

/**
 * Validates that the event has the necessary external sync unit ID
 * 
 * @param event - The event to validate
 * @returns An object with success status and message
 */
export function validateExternalSyncUnitId(event: any): { success: boolean; message: string; details?: any } {
  if (!event.payload.event_context || !event.payload.event_context.external_sync_unit_id) {
    return {
      success: false,
      message: 'Event is missing required external_sync_unit_id for data extraction',
      details: { missing_fields: 'event_context.external_sync_unit_id' }
    };
  }
  
  return { 
    success: true,
    message: 'External sync unit ID validation successful'
  };
}

/**
 * Gets the description of an event type
 * 
 * @param eventType - The event type
 * @returns A human-readable description of the event type
 */
export function getEventTypeDescription(eventType: EventType): string {
  switch (eventType) {
    case EventType.ExtractionExternalSyncUnitsStart:
      return 'external sync units extraction';
    case EventType.ExtractionMetadataStart:
      return 'metadata extraction';
    case EventType.ExtractionAttachmentsStart:
    case EventType.ExtractionAttachmentsContinue:
      return 'attachments extraction';
    case EventType.ExtractionDataStart:
    default:
      return 'data extraction';
  }
}