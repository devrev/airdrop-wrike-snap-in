import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Test data
const testEvent = {
  context: {
    secrets: {
      service_account_token: 'test-token'
    },
    snap_in_version_id: 'test-version-id'
  },
  execution_metadata: {
    function_name: 'data_extraction_check',
    devrev_endpoint: 'http://localhost:8003'
  },
  payload: {
    event_type: 'EXTRACTION_DATA_START',
    event_context: {
      callback_url: `${CALLBACK_SERVER_URL}/callback`,
      dev_org: 'test-org',
      dev_org_id: 'test-org-id',
      dev_user: 'test-user',
      dev_user_id: 'test-user-id',
      external_sync_unit: 'test-sync-unit',
      external_sync_unit_id: 'test-sync-unit-id',
      external_sync_unit_name: 'Test Sync Unit',
      external_system: 'test-system',
      external_system_type: 'test-system-type',
      import_slug: 'test-import-slug',
      mode: 'INITIAL',
      request_id: 'test-request-id',
      snap_in_slug: 'test-snap-in-slug',
      snap_in_version_id: 'test-version-id',
      sync_run: 'test-sync-run',
      sync_run_id: 'test-sync-run-id',
      sync_tier: 'test-tier',
      sync_unit: 'test-unit',
      sync_unit_id: 'test-unit-id',
      uuid: 'test-uuid',
      worker_data_url: 'http://localhost:8003/external-worker'
    },
    connection_data: {
      org_id: 'test-org-id',
      org_name: 'Test Org',
      key: 'test-key',
      key_type: 'test-key-type'
    }
  },
  input_data: {}
};

describe('Data Extraction Conformance Tests', () => {
  let callbackServer: Server;
  let callbackReceived = false;
  
  // Setup callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(express.json());
    
    // Endpoint to receive callback data
    app.post('/callback', (req, res) => {
      console.log('Callback received:', req.body);
      callbackReceived = true;
      res.status(200).json({ status: 'success' });
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
      done();
    });
  });
  
  // Cleanup after tests
  afterAll((done) => {
    // Close any open axios connections
    if (axios.defaults.adapter) {
      // Force axios to clean up any pending requests
      axios.defaults.adapter = undefined;
    }
    
    callbackServer.close(() => {
      console.log('Callback server closed');
      done();
    }
  )});
  
  // Reset callback flag before each test
  beforeEach(() => {
    callbackReceived = false;
  });
  
  // Test 1: Basic connectivity test
  test('should be able to connect to the Test Snap-In Server', async () => {
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, {
        context: { secrets: { service_account_token: 'test' } },
        execution_metadata: { function_name: 'canInvoke' },
        payload: {}
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    } catch (error: any) {
      fail(`Failed to connect to Test Snap-In Server: ${error}`);
    }
  });
  
  // Test 2: Function existence test
  test('should verify data_extraction_check function exists', async () => {
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, {
        context: { secrets: { service_account_token: 'test' } },
        execution_metadata: { function_name: 'data_extraction_check' },
        payload: {}
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.error).toBeUndefined();
    } catch (error: any) {
      fail(`Function data_extraction_check does not exist: ${error}`);
    }
  });
  
  // Test 3: Function invocation test
  test('should invoke data_extraction_check function with minimal parameters', async () => {
    try {
      const minimalEvent = {
        context: {
          secrets: {
            service_account_token: 'test-token'
          }
        },
        execution_metadata: {
          function_name: 'data_extraction_check'
        },
        payload: {}
      };
      
      const response = await axios.post(SNAP_IN_SERVER_URL, minimalEvent);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      // The function should return a result even with minimal parameters
      // It might indicate failure due to missing parameters, but should not throw an exception
    } catch (error: any) {
      fail(`Failed to invoke data_extraction_check with minimal parameters: ${error}`);
    }
  });
  
  // Test 4: Callback server test
  test('should verify callback server is working', async () => {
    try {
      // Send a test request to our callback endpoint
      const response = await axios.post(`${CALLBACK_SERVER_URL}/callback`, {
        test: 'data'
      });
      
      expect(response.status).toBe(200);
      expect(callbackReceived).toBe(true);
    } catch (error: any) {
      fail(`Callback server test failed: ${error}`);
    }
  });
  
  // Test 5: Complete workflow test
  test('should successfully complete data extraction workflow', async () => {
    try {
      // Send the complete event to the function
      const response = await axios.post(SNAP_IN_SERVER_URL, testEvent);
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      
      // Check the function result
      const result = response.data.function_result;
      expect(result.success).toBeDefined();
      
      // If the test is successful, the function should return success: true
      if (!result.success) {
        console.error('Data extraction failed:', result.message, result.details);
      }
      expect(result.success).toBe(true);
      
      // Wait a bit for any async operations to complete and then explicitly close any connections
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Force cleanup of any remaining connections
      if (axios.defaults.adapter) {
        // Force axios to clean up any pending requests
        axios.defaults.adapter = undefined;
      }

    } catch (error) {
      fail(`Data extraction workflow test failed: ${error}`);
    }
  });
});