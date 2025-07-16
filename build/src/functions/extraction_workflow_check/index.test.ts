import { run } from './index';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

describe('Extraction Workflow Check Function', () => {
  // Helper function to create a mock AirdropEvent
  const createMockEvent = (eventType: EventType): AirdropEvent => ({
    context: {
      secrets: {
        service_account_token: 'mock-token'
      },
      snap_in_id: 'mock-snap-in-id',
      snap_in_version_id: 'mock-version-id'
    },
    payload: {
      connection_data: {
        org_id: 'mock-org-id',
        org_name: 'mock-org-name',
        key: 'mock-key',
        key_type: 'mock-key-type'
      },
      event_context: {
        callback_url: 'mock-callback-url',
        dev_org: 'mock-dev-org',
        dev_org_id: 'mock-dev-org-id',
        dev_user: 'mock-dev-user',
        dev_user_id: 'mock-dev-user-id',
        external_sync_unit: 'mock-external-sync-unit',
        external_sync_unit_id: 'mock-external-sync-unit-id',
        external_sync_unit_name: 'mock-external-sync-unit-name',
        external_system: 'mock-external-system',
        external_system_type: 'mock-external-system-type',
        import_slug: 'mock-import-slug',
        mode: 'INITIAL',
        request_id: 'mock-request-id',
        snap_in_slug: 'mock-snap-in-slug',
        snap_in_version_id: 'mock-snap-in-version-id',
        sync_run: 'mock-sync-run',
        sync_run_id: 'mock-sync-run-id',
        sync_tier: 'mock-sync-tier',
        sync_unit: 'mock-sync-unit',
        sync_unit_id: 'mock-sync-unit-id',
        uuid: 'mock-uuid',
        worker_data_url: 'mock-worker-data-url'
      },
      event_type: eventType,
      event_data: {}
    },
    execution_metadata: {
      devrev_endpoint: 'mock-endpoint'
    },
    input_data: { 
      global_values: {}, 
      event_sources: {}
    }
  });

  it('should return success with valid_extraction_events=true for extraction event types', async () => {
    // Test with an extraction event type
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction workflow check function successfully invoked',
      valid_extraction_events: true
    });
  });

  it('should return success with valid_extraction_events=false for non-extraction event types', async () => {
    // Create a mock event with a non-extraction event type
    const mockEvent = createMockEvent(EventType.ExtractionMetadataStart);
    // Override with a non-extraction event type (this is just for test purposes)
    mockEvent.payload.event_type = 'SOME_OTHER_EVENT_TYPE' as EventType;

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction workflow check function successfully invoked',
      valid_extraction_events: false
    });
  });

  it('should validate all extraction event types', async () => {
    // Test all extraction event types
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

    for (const eventType of extractionEventTypes) {
      const mockEvent = createMockEvent(eventType);
      const result = await run([mockEvent]);
      
      expect(result.valid_extraction_events).toBe(true);
    }
  });

  it('should throw an error if events parameter is not an array', async () => {
    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call the function with invalid input
    const invalidInput = null as unknown as AirdropEvent[];
    
    // Expect the function to throw an error
    await expect(run(invalidInput)).rejects.toThrow('Invalid input: events must be an array');
    
    // Restore console.error
    jest.restoreAllMocks();
  });

  it('should throw an error if an event is missing required fields', async () => {
    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create an invalid event missing context
    const invalidEvent = {
      payload: {},
      execution_metadata: {}
    } as unknown as AirdropEvent;
    
    // Expect the function to throw an error
    await expect(run([invalidEvent])).rejects.toThrow('missing required field \'context\'');
    
    // Restore console.error
    jest.restoreAllMocks();
  });

  it('should handle multiple events correctly', async () => {
    // Create multiple events with different event types
    const event1 = createMockEvent(EventType.ExtractionDataStart);
    const event2 = createMockEvent(EventType.ExtractionMetadataStart);
    
    // Call the function with multiple events
    const result = await run([event1, event2]);
    
    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction workflow check function successfully invoked',
      valid_extraction_events: true
    });
  });
});