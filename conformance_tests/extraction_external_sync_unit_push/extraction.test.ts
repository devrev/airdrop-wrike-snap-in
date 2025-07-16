import axios from 'axios';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { EventType } from '@devrev/ts-adaas';
import { Server } from 'http';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds per test
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || '';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || '';
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY'; // Can be used when space ID is required

// Validate environment variables
if (!WRIKE_API_KEY) {
  console.error('WRIKE_API_KEY environment variable is required');
  process.exit(1);
}

if (!WRIKE_SPACE_GID) {
  console.error('WRIKE_SPACE_GID environment variable is required');
  process.exit(1);
}

// Setup callback server
let callbackServer: Server;
let receivedCallbacks: any[] = [];

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express.default();
    app.use(bodyParser.json());
    
    app.post('*', (req, res) => {
      receivedCallbacks.push(req.body);
      res.status(200).send({ status: 'success' });
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
}

function shutdownCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    if (callbackServer) {
      callbackServer.close(() => {
        console.log('Callback server shut down');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Helper function to create a test event
function createTestEvent(eventType: string = EventType.ExtractionExternalSyncUnitsStart) {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id'
    },
    execution_metadata: {
      function_name: 'extraction',
      devrev_endpoint: 'http://localhost:8003'
    },
    payload: {
      connection_data: {
        key: WRIKE_API_KEY,
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
      event_type: eventType,
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-org',
        dev_org_id: 'test-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: TEST_PROJECT_ID,
        external_sync_unit_id: TEST_PROJECT_ID,
        external_sync_unit_name: 'Test Project',
        external_system: 'wrike',
        external_system_type: 'wrike',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'test-snap-in-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    },
    input_data: {}
  };
}

// Setup and teardown
beforeAll(async () => {
  await setupCallbackServer();
});

afterAll(async () => {
  await shutdownCallbackServer();
});

beforeEach(() => {
  receivedCallbacks = [];
});

// Test cases
describe('Extraction Function Tests', () => {
  // Test 1: Basic validation test
  test('should accept a valid event', async () => {
    const event = createTestEvent();
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
  }, TEST_TIMEOUT);

  // Test 2: Event type handling test
  test('should handle non-extraction events correctly', async () => {
    const event = createTestEvent('SOME_OTHER_EVENT_TYPE');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
    
    // Since this is not an extraction event, we shouldn't receive any callbacks
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for potential callbacks
    expect(receivedCallbacks.length).toBe(0);
  }, TEST_TIMEOUT);

  // Test 3: Project fetching test
  test('should fetch projects and transform them into external sync units', async () => {
    const event = createTestEvent();
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
    
    // Wait for the callback to be received
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify we received at least one callback
    expect(receivedCallbacks.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
    const doneEvent = receivedCallbacks.find(
      callback => callback.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE'
    );
    
    expect(doneEvent).toBeDefined();
    expect(doneEvent.event_data).toBeDefined();
    expect(doneEvent.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(doneEvent.event_data.external_sync_units)).toBe(true);
    
    // Verify the structure of the external sync units
    const externalSyncUnits = doneEvent.event_data.external_sync_units;
    expect(externalSyncUnits.length).toBeGreaterThan(0);
    
    // Check the first external sync unit
    const firstUnit = externalSyncUnits[0];
    expect(firstUnit.id).toBeDefined();
    expect(firstUnit.name).toBeDefined();
    expect(firstUnit.description).toBeDefined();
    expect(firstUnit.item_type).toBe('tasks');
  }, TEST_TIMEOUT);

  // Test 4: End-to-end test
  test('should complete the full extraction workflow', async () => {
    const event = createTestEvent();
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
    
    // Wait for the callback to be received
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify we received callbacks
    expect(receivedCallbacks.length).toBeGreaterThan(0);
    
    // Check for the DONE event
    const doneEvent = receivedCallbacks.find(
      callback => callback.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE'
    );
    
    expect(doneEvent).toBeDefined();
    
    // Ensure no error events were received
    const errorEvent = receivedCallbacks.find(
      callback => callback.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR'
    );
    
    expect(errorEvent).toBeUndefined();
  }, TEST_TIMEOUT);
});