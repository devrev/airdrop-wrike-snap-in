import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
interface AirdropEvent {
  context: {
    secrets: {
      service_account_token: string;
    };
    snap_in_version_id: string;
    snap_in_id: string;
  };
  payload: {
    event_context?: {
      callback_url: string;
      [key: string]: any;
    }; 
    event_type?: string;
    [key: string]: any;
  };
  execution_metadata: {
    devrev_endpoint: string;
    function_name: string;
    [key: string]: any;
  };
  input_data?: any;
}

describe('Data Push Check Function Tests', () => {
  let callbackServer: Server;
  let receivedData: any = null;
  let callbackEndpoint = '/callback';

  // Setup callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(bodyParser.json());

    // Create callback endpoint
    app.post(callbackEndpoint, (req, res) => {
      receivedData = req.body;
      console.log('Callback server received data:', receivedData);
      res.status(200).json({ status: 'success' });
    });

    // Create endpoint that returns an error
    app.post('/error', (req, res) => {
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    });

    // Start the server
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
      done();
    });
  });

  // Clean up after tests
  afterAll((done) => {
    if (callbackServer) {
      callbackServer.close(done);
    } else {
      done();
    }
  });

  // Reset received data before each test
  beforeEach(() => {
    receivedData = null;
  });

  // Test 1: Basic Functionality - Verify successful data push
  test('should successfully push data to callback URL', async () => {
    // Create a valid AirdropEvent with callback URL
    const event: AirdropEvent = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version-id',
        snap_in_id: 'test-snap-in-id'
      },
      payload: {
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}${callbackEndpoint}`,
          dev_org: 'test-org',
          dev_org_id: 'test-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          external_sync_unit: 'test-unit',
          external_sync_unit_id: 'test-unit-id',
          external_sync_unit_name: 'test-unit-name',
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
          sync_unit: 'test-sync-unit',
          sync_unit_id: 'test-sync-unit-id',
          uuid: 'test-uuid',
          worker_data_url: 'http://localhost:8003/external-worker'
        }
      },
      execution_metadata: {
        devrev_endpoint: 'http://localhost:8003',
        function_name: 'data_push_check'
      }
    };

    // Send the event to the function
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.push_successful).toBe(true);
    
    // Wait a bit to ensure callback is processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify that our callback server received the data
    expect(receivedData).not.toBeNull();
    expect(receivedData.test_data).toBe('This is a test payload');
    expect(receivedData.snap_in_version_id).toBe('test-version-id');
  }, 10000);

  // Test 2: Error Handling - Verify error handling for unreachable callback URL
  test('should handle errors when callback URL returns an error', async () => {
    // Create an AirdropEvent with a callback URL that returns an error
    const event: AirdropEvent = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version-id',
        snap_in_id: 'test-snap-in-id'
      },
      payload: {
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/error`,
          dev_org: 'test-org',
          dev_org_id: 'test-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          external_sync_unit: 'test-unit',
          external_sync_unit_id: 'test-unit-id',
          external_sync_unit_name: 'test-unit-name',
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
          sync_unit: 'test-sync-unit',
          sync_unit_id: 'test-sync-unit-id',
          uuid: 'test-uuid',
          worker_data_url: 'http://localhost:8003/external-worker'
        }
      },
      execution_metadata: {
        devrev_endpoint: 'http://localhost:8003',
        function_name: 'data_push_check'
      }
    };

    // Send the event to the function
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('error');
    expect(response.data.function_result.push_successful).toBe(false);
    expect(response.data.function_result.error).toBeDefined();
  }, 10000);

  // Test 3: Input Validation - Verify validation of input parameters
  test('should validate input parameters', async () => {
    // Create an AirdropEvent with missing required fields
    const event = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version-id',
        snap_in_id: 'test-snap-in-id'
      },
      payload: {
        // Intentionally missing event_context with callback_url
        event_type: 'test-event-type'
      },
      execution_metadata: {
        devrev_endpoint: 'http://localhost:8003',
        function_name: 'data_push_check'
      }
    };

    // Send the event to the function
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('error');
    expect(response.data.function_result.push_successful).toBe(false);
    expect(response.data.function_result.error).toContain('missing required field');
  }, 10000);
});