import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

// Setup callback server
let callbackServer: Server;
let callbackReceived = false;
let callbackData: any = null;

// Setup callback server before tests
beforeAll((done) => {
  const app = express();
  app.use(bodyParser.json());
  
  app.post('/callback', (req, res) => {
    callbackReceived = true;
    callbackData = req.body;
    res.status(200).send({ status: 'ok' });
  });
  
  callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
    done();
  });
});

// Cleanup after tests
afterAll((done) => {
  callbackServer.close(() => {
    console.log('Callback server closed');
    done();
  });
});

// Reset callback state before each test
beforeEach(() => {
  callbackReceived = false;
  callbackData = null;
});

// Helper function to create a basic event payload
function createBasicEventPayload(functionName: string = 'canInvoke') {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_version_id: 'test-version-id'
    },
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'test-org-name',
        key: 'test-key',
        key_type: 'test-key-type'
      },
      event_context: {
        callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
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
      event_data: {},
      event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START'
    },
    execution_metadata: {
      devrev_endpoint: 'http://localhost:8003',
      function_name: functionName
    },
    input_data: {}
  };
}

describe('canInvoke Function Tests', () => {
  // Test 1: Basic functionality test
  test('should successfully invoke the canInvoke function and return expected response', async () => {
    const eventPayload = createBasicEventPayload();
    
    try {
      const response = await axios.post(TEST_SERVER_URL, eventPayload);
      
      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('can_invoke');
      expect(response.data.function_result).toHaveProperty('message');
      expect(response.data.function_result.can_invoke).toBe(true);
      expect(response.data.function_result.message).toBe('Function can be invoked successfully');
      
      // Verify no error was returned
      expect(response.data.error).toBeUndefined();
    } catch (error) {
      fail(`Test failed with error: ${error}`);
    }
  });

  // Test 2: Error handling test - invalid function name
  test('should handle invalid function name gracefully', async () => {
    const eventPayload = createBasicEventPayload('nonExistentFunction');
    
    try {
      const response = await axios.post(TEST_SERVER_URL, eventPayload);
      
      // Verify error response
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error).toHaveProperty('err_type');
      expect(response.data.error.err_type).toBe('FUNCTION_NOT_FOUND');
    } catch (error) {
      fail(`Test failed with error: ${error}`);
    }
  });

  // Test 3: Integration test with more realistic payload
  test('should handle a more complex event payload correctly', async () => {
    // Create a more detailed event payload
    const complexPayload = createBasicEventPayload();
    complexPayload.payload.event_data = {
      external_sync_units: [
        {
          id: 'unit-1',
          name: 'Test Unit 1',
          description: 'Test Description 1',
          item_count: 10,
          item_type: 'task'
        }
      ]
    };
    
    try {
      const response = await axios.post(TEST_SERVER_URL, complexPayload);
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result.can_invoke).toBe(true);
      
      // Verify no error was returned
      expect(response.data.error).toBeUndefined();
    } catch (error) {
      fail(`Test failed with error: ${error}`);
    }
  });

  // Test 4: Test with missing required fields
  test('should handle missing required fields appropriately', async () => {
    // Create a payload with missing execution_metadata
    const invalidPayload = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      },
      payload: {
        event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START'
      }
    };
    
    try {
      const response = await axios.post(TEST_SERVER_URL, invalidPayload);
      
      // Expect an error response
      expect(response.status).toBe(400);
    } catch (error: any) {
      // Axios throws an error for non-2xx responses
      expect(error.response.status).toBe(400);
    }
  });
});