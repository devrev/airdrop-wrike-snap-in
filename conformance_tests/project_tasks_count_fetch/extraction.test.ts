import axios from 'axios';
import express from 'express';
import * as bodyParser from 'body-parser';
import { Server } from 'http';
import { EventType } from '@devrev/ts-adaas';

// Configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 30000; // 30 seconds per test

// Environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || 'IEAGS6BYI5RFMPPY'; // Default to test ID if not provided
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY'; // Can be used when space ID is required

// Validate environment variables
if (!WRIKE_API_KEY) {
  throw new Error('WRIKE_API_KEY environment variable is required');
}

// Setup callback server
let callbackServer: Server;
let callbackData: any[] = [];

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());

    app.post('*', (req, res) => {
      console.log('Callback received:', JSON.stringify(req.body));
      callbackData.push(req.body);
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
        console.log('Callback server closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Create a mock AirdropEvent for testing
function createExtractionEvent(eventType: EventType) {
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
        key: WRIKE_API_KEY,
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
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
        snap_in_slug: 'wrike',
        snap_in_version_id: 'test-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType,
      event_data: {}
    },
    execution_metadata: {
      devrev_endpoint: 'http://localhost:8003',
      function_name: 'extraction'
    },
    input_data: {}
  };
}

// Helper function to invoke the snap-in function
async function invokeFunction(event: any): Promise<any> {
  try {
    const response = await axios.post(TEST_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error invoking function:', error);
    throw error;
  }
}

// Clear callback data between tests
function clearCallbackData() {
  callbackData = [];
}

// Setup and teardown
beforeAll(async () => {
  await setupCallbackServer();
});

afterAll(async () => {
  await shutdownCallbackServer();
});

beforeEach(() => {
  clearCallbackData();
});

// Test cases
describe('Extraction Function Tests', () => {
  // Test 1: Basic test to verify the extraction function exists and can be invoked
  test('extraction function exists and can be invoked', async () => {
    const event = createExtractionEvent(EventType.ExtractionExternalSyncUnitsStart);
    const result = await invokeFunction(event);
    
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('success');
    expect(result.error).toBeUndefined();
  }, TEST_TIMEOUT);

  // Test 2: Verify that the extraction function correctly processes EXTRACTION_EXTERNAL_SYNC_UNITS_START events
  test('extraction function processes EXTRACTION_EXTERNAL_SYNC_UNITS_START events', async () => {
    const event = createExtractionEvent(EventType.ExtractionExternalSyncUnitsStart);
    await invokeFunction(event);
    
    // Wait for callbacks to be processed (up to 10 seconds)
    let attempts = 0;
    while (callbackData.length === 0 && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    // Verify that we received at least one callback
    expect(callbackData.length).toBeGreaterThan(0);
    
    // Verify that the callback contains external_sync_units
    const lastCallback = callbackData[callbackData.length - 1];
    expect(lastCallback).toBeDefined();
    expect(lastCallback.event_data).toBeDefined();
    expect(lastCallback.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(lastCallback.event_data.external_sync_units)).toBe(true);
  }, TEST_TIMEOUT);

  // Test 3: Verify that projects pushed as external sync units include task counts
  test('projects pushed as external sync units include task counts', async () => {
    const event = createExtractionEvent(EventType.ExtractionExternalSyncUnitsStart);
    await invokeFunction(event);
    
    // Wait for callbacks to be processed (up to 10 seconds)
    let attempts = 0;
    while (callbackData.length === 0 && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    // Verify that we received at least one callback
    expect(callbackData.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE callback
    const doneCallback = callbackData.find(callback => 
      callback.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE'
    );
    
    expect(doneCallback).toBeDefined();
    expect(doneCallback.event_data).toBeDefined();
    expect(doneCallback.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(doneCallback.event_data.external_sync_units)).toBe(true);
    
    // Verify that each external sync unit has an item_count property
    const externalSyncUnits = doneCallback.event_data.external_sync_units;
    expect(externalSyncUnits.length).toBeGreaterThan(0);
    
    for (const unit of externalSyncUnits) {
      expect(unit).toHaveProperty('id');
      expect(unit).toHaveProperty('name');
      expect(unit).toHaveProperty('description');
      expect(unit).toHaveProperty('item_count');
      expect(unit).toHaveProperty('item_type');
      expect(typeof unit.item_count).toBe('number');
      expect(unit.item_type).toBe('tasks');
    }
  }, TEST_TIMEOUT);
});