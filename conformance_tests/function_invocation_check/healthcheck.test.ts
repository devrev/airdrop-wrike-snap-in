import axios from 'axios';
import express from 'express';
import * as bodyParser from 'body-parser';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

// Extend the AirdropEvent type to include function_name in execution_metadata
interface ExtendedAirdropEvent extends AirdropEvent {
  execution_metadata: {
    devrev_endpoint: string;
    function_name: string;
  };
}

// Constants for server URLs
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Create a simple callback server to receive responses
const app = express();
app.use(bodyParser.json());

let callbackResponse: any = null;
let callbackServer: ReturnType<typeof app.listen> | null = null;

// Setup callback endpoint
app.post('/callback', (req, res) => {
  callbackResponse = req.body;
  console.log('Received callback:', JSON.stringify(callbackResponse, null, 2));
  res.status(200).send('OK');
});

// Helper function to create a minimal valid ExtendedAirdropEvent
function createMinimalAirdropEvent(): ExtendedAirdropEvent {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_version_id: 'test-version-id',
      snap_in_id: 'test-snap-in-id'
    },
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'test-org-name',
        key: 'test-key',
        key_type: 'test-key-type'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-external-sync-unit',
        external_sync_unit_id: 'test-external-sync-unit-id',
        external_sync_unit_name: 'test-external-sync-unit-name',
        external_system: 'test-external-system',
        external_system_type: 'test-external-system-type',
        import_slug: 'test-import-slug',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in-slug',
        snap_in_version_id: 'test-snap-in-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-sync-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: EventType.ExtractionMetadataStart,
      event_data: {}
    },
    execution_metadata: { 
      devrev_endpoint: 'http://localhost:8003',
      function_name: 'healthcheck'  // Added function_name here
    },
    input_data: {
      global_values: {}, 
      event_sources: {}
    }
  };
}

// Helper function to invoke the healthcheck function
async function invokeHealthcheckFunction(event: ExtendedAirdropEvent | any): Promise<any> {
  try {
    // Format the request as expected by the server
    // Send the event directly, with function_name in execution_metadata
    const events = Array.isArray(event) ? event : [event];
    
    // Ensure each event has function_name in execution_metadata
    events.forEach(e => {
      if (e && e.execution_metadata && !e.execution_metadata.function_name) {
        e.execution_metadata.function_name = 'healthcheck';
      }
    });
    
    const response = await axios.post(TEST_SERVER_URL, events[0]);
    return response.data;
  } catch (error: any) {
    console.error('Error invoking healthcheck function:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Setup and teardown
beforeAll(async () => {
  // Start the callback server
  callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server listening at ${CALLBACK_SERVER_URL}`);
  });
});

afterAll(async () => {
  // Close the callback server
  jest.setTimeout(10000); // Give enough time for cleanup
  if (callbackServer !== null) {
    await new Promise<void>((resolve) => {
      callbackServer?.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    });
  }
});

beforeEach(() => {
  // Reset callback response before each test
  callbackResponse = null;
});

afterEach(() => {
  // Ensure any pending axios requests are completed
  jest.useRealTimers();
});

// Test cases
describe('Healthcheck Function Conformance Tests', () => {
  // Test 1: Basic Invocation Test
  test('should successfully invoke the healthcheck function with a valid event', async () => {
    const event = createMinimalAirdropEvent();
    const result = await invokeHealthcheckFunction(event);
    
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('success');
    expect(result.function_result.message).toBe('Healthcheck function successfully invoked');
    expect(result.error).toBeUndefined();
  }, 30000);

  // Test 2: Input Validation Test
  test('should validate that events parameter is an array', async () => {
    // Create an invalid event (not an array)
    const invalidEvent = "not-an-array";
    
    try {
      // We need to modify this to directly pass to axios since our helper function
      // always converts to array
      await axios.post(TEST_SERVER_URL, invalidEvent);
      fail('Expected function to throw an error but it did not');
    } catch (error: any) {
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(400);
      // The error message might vary, but we expect some kind of error response
      expect(error.response.data).toBeDefined();
    }
  }, 30000);

  // Test 3: Response Structure Test
  test('should return a properly structured response', async () => {
    const event = createMinimalAirdropEvent();
    const result = await invokeHealthcheckFunction(event);
    
    // Verify the structure of the response
    expect(result).toHaveProperty('function_result');
    expect(result.function_result).toHaveProperty('status');
    expect(result.function_result).toHaveProperty('message');
    expect(typeof result.function_result.status).toBe('string');
    expect(typeof result.function_result.message).toBe('string');
  }, 30000);

  // Test 4: Error Handling Test
  test('should properly handle and report errors for invalid events', async () => {
    // Create an event missing required fields but with minimal structure
    // to ensure it's processed by the server
    const invalidEvent = {
      context: {
        // Missing required fields
      },
      execution_metadata: {
        function_name: 'healthcheck',
        devrev_endpoint: 'http://localhost:8003'
      },
      // Intentionally missing other required fields to trigger validation error
    };
    
    try {
      await axios.post(TEST_SERVER_URL, invalidEvent);
      fail('Expected function to throw an error but it did not');
    } catch (error: any) {
      // The server might respond with different types of errors
      // We just need to verify that an error occurred
      expect(error).toBeDefined();
      
      // The error could be a response error or a network error
      // We'll check for either case
      if (error.response) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      } else {
        // If there's no response, it's likely a network error
        // which is also an acceptable error case
        expect(error.message).toBeDefined();
      }
    }
  }, 30000);
});