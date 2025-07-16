// Mock the spawn function to prevent actual worker spawning during tests
const mockSpawn = jest.fn().mockResolvedValue(undefined);
jest.mock('../generate_initial_mapping/initial_domain_mapping.json', () => ({}));

// Mock the @devrev/ts-adaas module
jest.mock('@devrev/ts-adaas', () => {
  const actual = jest.requireActual('@devrev/ts-adaas');
  return { 
    ...actual, 
    spawn: mockSpawn 
  };
});

import { run } from './index';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

describe('Data Extraction Check Function', () => {
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

  it('should return success with valid_data_extraction_events=true for data extraction event types', async () => {
    // Test with the data extraction event type
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction check function successfully invoked',
      valid_data_extraction_events: true
    });
    
    // Verify that spawn was called with the correct parameters
    expect(mockSpawn).toHaveBeenCalled();
    expect(mockSpawn.mock.calls[0][0]).toHaveProperty('initialDomainMapping');
  });

  it('should return success with valid_data_extraction_events=true for ExtractionDataContinue event type', async () => {
    // Test with the data extraction continue event type
    const mockEvent = createMockEvent(EventType.ExtractionDataContinue);

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction check function successfully invoked',
      valid_data_extraction_events: true
    });
    
    // Verify that spawn was called with the correct parameters
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should return success with valid_data_extraction_events=false for other extraction event types', async () => {
    // Test with a different extraction event type
    // Create a mock event with a non-data extraction event type
    const mockEvent = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);
    
    // Reset the mock before this specific test
    mockSpawn.mockClear();
    
    // Ensure the event type is explicitly set to a non-data extraction type
    mockEvent.payload = {
      ...mockEvent.payload,
      event_type: EventType.ExtractionExternalSyncUnitsStart
    };

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction check function successfully invoked',
      valid_data_extraction_events: false
    });
    
    // Verify that spawn was not called
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('should throw an error if events parameter is not an array', async () => {
    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call the function with invalid input
    const invalidInput = null as unknown as AirdropEvent[];
    
    // Expect the function to throw an error
    await expect(run(invalidInput)).rejects.toThrow();
    
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
    await expect(run([invalidEvent])).rejects.toThrow();
    
    // Restore console.error
    jest.restoreAllMocks();
  });

  it('should handle multiple events correctly', async () => {
    // Create multiple events with different event types
    const event1 = {
      ...createMockEvent(EventType.ExtractionDataStart),
      payload: { ...createMockEvent(EventType.ExtractionDataStart).payload, event_type: EventType.ExtractionDataStart }
    };
    const event2 = {
      ...createMockEvent(EventType.ExtractionMetadataStart),
      payload: { ...createMockEvent(EventType.ExtractionMetadataStart).payload, event_type: EventType.ExtractionMetadataStart }
    };
    
    // Call the function with multiple events
    const result = await run([event1, event2]);
    
    // Verify the result - should be true because at least one event is ExtractionDataStart
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction check function successfully invoked',
      valid_data_extraction_events: true
    });
    
    // Verify that spawn was called with the correct parameters
    expect(mockSpawn).toHaveBeenCalled();
  });

  it('should handle empty events array', async () => {
    // Mock console.log to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Call the function with an empty array
    const result = await run([]);
    
    // Verify the result - should be false because there are no events
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction check function successfully invoked',
      valid_data_extraction_events: false
    });
    
    // Restore console.log
    jest.restoreAllMocks();
  });
});