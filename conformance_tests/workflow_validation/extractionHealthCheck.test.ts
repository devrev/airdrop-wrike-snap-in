import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';

// The exact content from the provided resource
const EXTRACTION_HEALTH_CHECK_JSON = {
  "execution_metadata": {
    "function_name": "extraction_health_check",
    "devrev_endpoint": "http://localhost:8003"
  },
  "payload": {
    "event_type": "EXTRACTION_EXTERNAL_SYNC_UNITS_START",
    "event_context": {
      "callback_url": "http://localhost:8002/callback",
      "dev_org": "test-dev-org",
      "external_sync_unit_id": "test-external-sync-unit",
      "sync_unit_id": "test-sync-unit",
      "worker_data_url": "http://localhost:8003/external-worker"
    },
    "connection_data": {
      "org_id": "test-org-id",
      "key": "key=test-key&token=test-token"
    }
  },
  "context": {
    "secrets": {
      "service_account_token": "test-token"
    }
  }
};

// Helper function to make requests to the test server
async function callFunction(event: any) {
  try {
    // Create a new object with the correct function name, not overridden by event.execution_metadata
    const response = await axios.post(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'canInvokeExtraction', 
        devrev_endpoint: event.execution_metadata?.devrev_endpoint || 'http://localhost:8003'
      },
      payload: event.payload,
      context: event.context
    });
    return response.data;
  } catch (error) {
    console.error('Error calling function:', error);
    throw error;
  }
}

describe('Extraction Health Check Test', () => {
  // Test 1: Basic test with the extraction health check event using canInvokeExtraction function
  test('should validate the extraction health check event', async () => {
    const result = await callFunction(EXTRACTION_HEALTH_CHECK_JSON);
    
    // Verify the response structure
    expect(result).toHaveProperty('function_result');
    expect(result.function_result).toHaveProperty('can_invoke');
    expect(result.function_result).toHaveProperty('message');
    
    // The event should be valid for extraction
    expect(result.function_result.can_invoke).toBe(true);
    expect(result.function_result.message).toContain('successfully');
  });

  // Test 2: Test with modified event (missing service_account_token)
  test('should reject the event when service_account_token is missing', async () => {
    // Create a modified event with missing service_account_token
    const modifiedEvent = JSON.parse(JSON.stringify(EXTRACTION_HEALTH_CHECK_JSON));
    delete modifiedEvent.context.secrets.service_account_token;
    
    const result = await callFunction(modifiedEvent);
    
    // The event should be invalid for extraction
    expect(result.function_result.can_invoke).toBe(false);
    expect(result.function_result.message).toContain('missing required authentication context');
  });

  // Test 3: Test with modified event (invalid event_type)
  test('should reject the event when event_type is invalid', async () => {
    // Create a modified event with an invalid event_type
    const modifiedEvent = JSON.parse(JSON.stringify(EXTRACTION_HEALTH_CHECK_JSON));
    modifiedEvent.payload.event_type = 'INVALID_EVENT_TYPE';
    
    const result = await callFunction(modifiedEvent);
    
    // The event should be invalid for extraction
    expect(result.function_result.can_invoke).toBe(false);
    expect(result.function_result.message).toContain('not an extraction event type');
    expect(result.function_result).toHaveProperty('details');
    expect(result.function_result.details).toHaveProperty('received_event_type');
    expect(result.function_result.details).toHaveProperty('supported_event_types');
  });

  // Test 4: Test with the exact event structure from the resource file
  test('should process the exact event structure from the resource file', async () => {
    // This test ensures that the exact structure from the resource file works
    try {
      const result = await callFunction(EXTRACTION_HEALTH_CHECK_JSON);
      
      // Log detailed information for debugging
      console.log('Resource file event:', JSON.stringify(EXTRACTION_HEALTH_CHECK_JSON, null, 2));
      console.log('Response:', JSON.stringify(result, null, 2));
      
    // The event should be valid for extraction
    expect(result.function_result.can_invoke).toBe(true);
    expect(result.function_result.message).toContain('successfully');
    } catch (error) {
      fail(`Failed to process the event: ${error}`);
    }
  });
});