import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import http, { Server } from 'http';
import { AddressInfo } from 'net';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const FUNCTION_NAME = 'extraction_external_sync_unit_check';

describe('Extraction External Sync Unit Check Tests', () => {
  let callbackServer: Server;
  let callbackUrl: string;
  let callbackData: any[] = [];

  // Set up callback server before tests
  beforeAll((done) => {
    const app = express(); 
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post('*', (req, res) => {
      console.log('Callback received:', JSON.stringify(req.body));
      callbackData.push(req.body);
      res.status(200).send({ status: 'success' });
    });

    // Start the callback server
    callbackServer = app.listen(CALLBACK_SERVER_PORT, '0.0.0.0', () => {
      const address = callbackServer.address() as AddressInfo;
      callbackUrl = `http://localhost:${address.port}/callback`;
      console.log(`Callback server listening at ${callbackUrl}`);
      done();
    });
  });

  // Clean up after tests
  afterAll((done) => {
    if (callbackServer && callbackServer.listening) {
      callbackServer.close(done);
    } else {
      done();
    }
  });

  // Reset callback data before each test
  beforeEach(() => {
    callbackData = [];
  });

  // Test 1: Basic - Verify the function can be called and returns a success response
  test('should successfully invoke the extraction_external_sync_unit_check function', async () => {    
    // Create a valid event for the function
    const event = createValidEvent();
    
    // Call the function
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('External sync units extraction test completed successfully');
  });

  // Test 2: Validation - Verify the function properly validates input events
  test('should return error when event is missing required fields', async () => {
    // Create an invalid event missing required fields
    const invalidEvent = {
      execution_metadata: {
        function_name: FUNCTION_NAME,
      },
      // Missing payload and context
    };
    
    // Call the function
    const response = await axios.post(TEST_SERVER_URL, invalidEvent);
    
    // Verify the response indicates failure
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Event payload or event_type is missing');
  });

  // Test 3: Integration - Verify the function correctly processes events and emits external sync units
  test('should process event and emit external sync units to callback URL', async () => {
    // Create a valid event with our callback URL
    const event = createValidEvent(callbackUrl);
    
    // Call the function
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    // Wait for callback to be received (up to 5 seconds)
    await waitForCallback(5000);
    
    // Verify callback data
    expect(callbackData.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
    const syncUnitsDoneEvent = callbackData.find(
      data => data.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE'
    );
    
    // Verify the event contains external sync units
    expect(syncUnitsDoneEvent).toBeDefined();
    expect(syncUnitsDoneEvent.event_data).toBeDefined();
    expect(syncUnitsDoneEvent.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(syncUnitsDoneEvent.event_data.external_sync_units)).toBe(true);
    expect(syncUnitsDoneEvent.event_data.external_sync_units.length).toBeGreaterThan(0);
    
    // Verify the structure of external sync units
    const externalSyncUnit = syncUnitsDoneEvent.event_data.external_sync_units[0];
    expect(externalSyncUnit.id).toBeDefined();
    expect(externalSyncUnit.name).toBeDefined();
    expect(externalSyncUnit.description).toBeDefined();
  });

  // Helper function to create a valid event
  function createValidEvent(callback = 'https://example.com/callback') {
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
          org_name: 'Test Org',
          key: 'test-key',
          key_type: 'test-key-type'
        },
        event_context: {
          callback_url: callback,
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
        event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START'
      },
      execution_metadata: {
        function_name: FUNCTION_NAME,
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {}
    };
  }

  // Helper function to wait for callback data
  async function waitForCallback(timeout: number): Promise<void> {
    const startTime = Date.now();
    while (callbackData.length === 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
});