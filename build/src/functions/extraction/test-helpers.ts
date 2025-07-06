import { EventType } from '@devrev/ts-adaas';

/**
 * Creates a mock event for testing extraction functionality
 * 
 * @param eventType - The event type to use
 * @param includeConnectionData - Whether to include connection data
 * @param includeAuthContext - Whether to include authentication context
 * @returns A mock event object
 */
export function createMockEvent(
  eventType: EventType = EventType.ExtractionExternalSyncUnitsStart,
  includeConnectionData: boolean = true,
  includeAuthContext: boolean = true
): any {
  const event: any = {
    payload: {
      event_type: eventType
    }
  };

  if (includeConnectionData) {
    event.payload.connection_data = {
      key: 'valid-api-key',
      org_id: 'space-id'
    };
  }

  if (includeAuthContext) {
    event.context = {
      secrets: {
        service_account_token: 'mock-token'
      }
    };
  }

  // Add event_context with external_sync_unit_id for data extraction
  if (eventType === EventType.ExtractionDataStart) {
    event.payload.event_context = {
      ...event.payload.event_context,
      external_sync_unit_id: 'test-project-id'
    };
  }

  // Add event_context with external_sync_unit_id for attachments extraction
  if (eventType === EventType.ExtractionAttachmentsStart || 
      eventType === EventType.ExtractionAttachmentsContinue) {
    event.payload.event_context = {
      ...event.payload.event_context,
      external_sync_unit_id: 'test-project-id'
    };
  }

  return event;
}

/**
 * Creates a mock error for testing error handling
 * 
 * @param message - The error message
 * @returns A new Error object
 */
export function createMockError(message: string = 'Test error'): Error {
  return new Error(message);
}

/**
 * Standard mock events for common test cases
 */
export const mockEvents = {
  valid: [createMockEvent()],
  validMetadata: [createMockEvent(EventType.ExtractionMetadataStart, false, true)],
  validData: [createMockEvent(EventType.ExtractionDataStart, true, true)],
  validAttachments: [createMockEvent(EventType.ExtractionAttachmentsStart, true, true)],
  empty: [],
  missingPayload: [{ context: {} }],
  missingConnectionData: [createMockEvent(EventType.ExtractionExternalSyncUnitsStart, false, true)],
  missingAuthContext: [createMockEvent(EventType.ExtractionExternalSyncUnitsStart, true, false)],
  // Use a genuinely unsupported event type
  unsupportedEventType: [{
    payload: {
      event_type: 'UNSUPPORTED_EVENT_TYPE',
      connection_data: { key: 'valid-api-key', org_id: 'space-id' }
    },
    context: { secrets: { service_account_token: 'mock-token' } }
  }],
  missingApiKey: [{
    payload: {
      event_type: EventType.ExtractionExternalSyncUnitsStart,
      connection_data: {
        org_id: 'space-id'
      }
    },
    context: {
      secrets: {
        service_account_token: 'mock-token'
      }
    }
  }],
  missingSpaceId: [{
    payload: {
      event_type: EventType.ExtractionExternalSyncUnitsStart,
      connection_data: {
        key: 'valid-api-key'
      }
    },
    context: {
      secrets: {
        service_account_token: 'mock-token'
      }
    }
  }],
  missingExternalSyncUnitId: [{
    payload: {
      event_type: EventType.ExtractionDataStart,
      connection_data: {
        key: 'valid-api-key',
        org_id: 'space-id'
      },
      event_context: {}
    },
    context: {
      secrets: { service_account_token: 'mock-token' }
    }
  }]
};