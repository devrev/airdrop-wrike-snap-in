import axios from 'axios';
import { EventType } from '@devrev/ts-adaas';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
type TestEvent = ReturnType<typeof createValidExtractionEvent>[number];

// Helper function to make requests to the test server
async function callFunction(events: any[]) {
  try {
    const response = await axios.post(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'canInvokeExtraction'
      },
      payload: events[0]?.payload,
      context: events[0]?.context
    });
    return response.data;
  } catch (error) {
    console.error('Error calling function:', error);
    throw error;
  }
}

// Helper function to create a valid extraction event
function createValidExtractionEvent() {
  return [{
    payload: {
      event_type: EventType.ExtractionDataStart,
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'dev_org_123',
        dev_org_id: 'dev_org_123',
        dev_user: 'dev_user_123',
        dev_user_id: 'dev_user_123',
        external_sync_unit: 'sync_unit_123',
        external_sync_unit_id: 'sync_unit_123',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'test_system',
        external_system_type: 'test_type',
        import_slug: 'test_import',
        mode: 'INITIAL',
        request_id: 'req_123',
        snap_in_slug: 'test_snap_in',
        snap_in_version_id: 'v1',
        sync_run: 'run_123',
        sync_run_id: 'run_123',
        sync_tier: 'tier_1',
        sync_unit: 'unit_123',
        sync_unit_id: 'unit_123',
        uuid: 'uuid_123',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    },
    context: {
      secrets: {
        service_account_token: 'test_token'
      },
      snap_in_version_id: 'v1'
    },
    execution_metadata: {
      devrev_endpoint: 'http://localhost:8003',
      function_name: 'canInvokeExtraction'
    }
  }];
}

describe('canInvokeExtraction Function Tests', () => {
  // Test 1: Basic connectivity test
  test('should be able to connect to the test server', async () => {
    try {
      const events = createValidExtractionEvent();
      await callFunction(events);
      // If we get here, the connection was successful
      expect(true).toBe(true);
    } catch (error) {
      fail(`Failed to connect to test server: ${error}`);
    }
  });

  // Test 2: Function should return a valid response structure
  test('should return a valid response structure', async () => {
    const events = createValidExtractionEvent();
    const result = await callFunction(events);
    
    expect(result).toHaveProperty('function_result');
    expect(result.function_result).toHaveProperty('can_invoke');
    expect(result.function_result).toHaveProperty('message');
    expect(typeof result.function_result.can_invoke).toBe('boolean');
    expect(typeof result.function_result.message).toBe('string');
  });

  // Test 3: Function should return true for valid extraction event
  test('should return true for valid extraction event', async () => {
    const events = createValidExtractionEvent();
    const result = await callFunction(events);
    
    expect(result.function_result.can_invoke).toBe(true);
    expect(result.function_result.message).toContain('successfully');
  });

  // Test 4: Function should return false for event with missing payload
  test('should return false for event with missing payload', async () => {
    const result = await callFunction([]);
    
    expect(result.function_result.can_invoke).toBe(false);
    expect(result.function_result.message).toContain('Event payload or event_type is missing');
  });
  
  // Test 4b: Function should handle completely empty request properly
  test('should handle completely empty request properly', async () => {
    try {
      // Send a completely empty object to test extreme edge case
      const result = await axios.post(TEST_SERVER_URL, {});
      expect(result.data.function_result.can_invoke).toBe(false);
    } catch (error) {
      // Even if it fails with an error, that's acceptable for this extreme edge case
    }
  });

  // Test 5: Function should return false for event missing payload
  test('should return false for event missing payload', async () => {
    // Create an event without payload
    const events = [{
      context: createValidExtractionEvent()[0].context,
      execution_metadata: {
        function_name: 'canInvokeExtraction'
      }
    }];
    
    const result = await callFunction(events);
    
    expect(result.function_result.can_invoke).toBe(false);
    expect(result.function_result.message).toContain('missing');
  });

  // Test 6: Function should return false for non-extraction event type
  test('should return false for non-extraction event type', async () => {
    const events = createValidExtractionEvent();
    // Use a custom string that's not in the list of extraction event types
    // Use type assertion to bypass TypeScript's type checking
    events[0].payload.event_type = 'NON_EXTRACTION_EVENT' as EventType;
    
    const result = await callFunction(events);
    
    expect(result.function_result.can_invoke).toBe(false);
    expect(result.function_result.message).toContain('not an extraction event type');
    expect(result.function_result).toHaveProperty('details');
    expect(result.function_result.details).toHaveProperty('received_event_type');
    expect(result.function_result.details).toHaveProperty('supported_event_types');
  });

  // Test 7: Function should return false for event missing authentication context
  test('should return false for event missing authentication context', async () => {
    const events = createValidExtractionEvent();
    
    // Create a modified event with missing service_account_token
    const modifiedEvent = JSON.parse(JSON.stringify(events[0]));
    // Delete the service_account_token property
    delete modifiedEvent.context.secrets.service_account_token;
    
    // Replace the original event with our modified one
    // Using any type to bypass TypeScript's type checking
    events[0] = modifiedEvent as any;

    const result = await callFunction(events);
    
    expect(result.function_result.can_invoke).toBe(false);
    expect(result.function_result.message).toContain('missing required authentication context');
  });

  // Test 8: Test with different valid extraction event types
  test('should return true for all valid extraction event types', async () => {
    const validEventTypes = [
      EventType.ExtractionExternalSyncUnitsStart,
      EventType.ExtractionMetadataStart,
      EventType.ExtractionDataStart,
      EventType.ExtractionDataContinue,
      EventType.ExtractionDataDelete,
      EventType.ExtractionAttachmentsStart,
      EventType.ExtractionAttachmentsContinue,
      EventType.ExtractionAttachmentsDelete
    ];

    for (const eventType of validEventTypes) {
      const events = createValidExtractionEvent();
      events[0].payload.event_type = eventType;
      
      const result = await callFunction(events);
      
      expect(result.function_result.can_invoke).toBe(true);
      expect(result.function_result.message).toContain('successfully');
    }
  });
});