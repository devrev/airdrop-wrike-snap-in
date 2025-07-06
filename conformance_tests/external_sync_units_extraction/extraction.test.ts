import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import { EventType } from '@devrev/ts-adaas';
import bodyParser from 'body-parser';

// Configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 30000; // 30 seconds per test

// Read environment variables
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

// Define interfaces for the event structure
interface EventContext {
  callback_url?: string;
  dev_org?: string;
  dev_org_id?: string;
  dev_user?: string;
  dev_user_id?: string;
  external_sync_unit?: string;
  external_sync_unit_id?: string;
  external_sync_unit_name?: string;
  external_system?: string;
  external_system_type?: string;
  import_slug?: string;
  mode?: string;
  request_id?: string;
  snap_in_slug?: string;
  snap_in_version_id?: string;
  sync_run?: string;
  sync_run_id?: string;
  sync_tier?: string;
  sync_unit?: string;
  sync_unit_id?: string;
  uuid?: string;
  worker_data_url?: string;
}

interface ConnectionData {
  key: string;
  org_id: string;
  org_name?: string;
  key_type?: string;
}

interface EventPayload {
  event_type: string;
  connection_data?: ConnectionData;
  event_context?: EventContext;
}

interface Context {
  dev_oid: string;
  source_id: string;
  snap_in_id: string;
  snap_in_version_id: string;
  service_account_id: string;
  secrets: {
    service_account_token: string;
  };
}

interface ExecutionMetadata {
  request_id: string;
  function_name: string;
  event_type: string;
  devrev_endpoint: string;
}

interface Event {
  context: Context;
  execution_metadata: ExecutionMetadata;
  input_data: {
    global_values: Record<string, string>;
    event_sources: Record<string, string>;
  };
  payload: EventPayload;
}

describe('Extraction Function Tests', () => {
  let callbackServer: Server;
  let receivedData: any[] = [];

  // Setup callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post('*', (req, res) => {
      console.log('Callback received:', JSON.stringify(req.body));
      receivedData.push(req.body);
      res.status(200).send({ success: true });
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
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
    receivedData = [];
  });

  // Test 1: Basic Invocation
  test('should successfully invoke the extraction function', async () => {
    // Create a minimal valid event
    const event = createBasicEvent();
    
    // Send request to the test server
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Unsupported event type');
  }, TEST_TIMEOUT);

  // Test 2: Missing Parameters
  test('should handle missing parameters correctly', async () => {
    // Create event with missing connection data
    const event = {
      ...createBasicEvent(),
      payload: {
        event_type: EventType.ExtractionExternalSyncUnitsStart
      }
    };
    
    // Send request to the test server
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('missing required connection data');
  }, TEST_TIMEOUT);

  // Test 3: Full Extraction Flow
  test('should extract projects as external sync units', async () => {
    // Create a complete event for extraction
    const event = createExtractionEvent();
    
    // Send request to the test server
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    
    // Wait for callback to be received (up to 5 seconds)
    await waitForCallback(5000);
    
    // Verify callback data
    expect(receivedData.length).toBeGreaterThan(0);
    console.log('Received callbacks:', JSON.stringify(receivedData));
    
    // Check the last received callback
    const lastCallback = receivedData[receivedData.length - 1];
    expect(lastCallback).toBeDefined();
    
    // The external sync units are in event_data.external_sync_units, not directly in the root
    expect(lastCallback.event_data).toBeDefined();
    expect(lastCallback.event_data.external_sync_units).toBeDefined();

    expect(Array.isArray(lastCallback.event_data.external_sync_units)).toBe(true);

    // Verify structure of external sync units
    if (lastCallback.event_data.external_sync_units.length > 0) {
      const firstUnit = lastCallback.event_data.external_sync_units[0];
      expect(firstUnit.id).toBeDefined();
      expect(firstUnit.name).toBeDefined();
      expect(firstUnit.description).toBeDefined();
      expect(firstUnit.item_type).toBe('project');
    }
  }, TEST_TIMEOUT);

  // Helper function to create a basic event
  function createBasicEvent(): Event {
    return {
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: 'extraction',
        event_type: 'test-event-type',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      },
      payload: {
        event_type: 'TEST_EVENT_TYPE',
        connection_data: {
          key: WRIKE_API_KEY,
          org_id: WRIKE_SPACE_GID
        }
      }
    };
  }

  // Helper function to create an extraction event
  function createExtractionEvent(): Event {
    const event = createBasicEvent();
    event.payload.event_type = EventType.ExtractionExternalSyncUnitsStart;
    
    // Initialize event_context if it doesn't exist
    event.payload.event_context = {};
    event.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    
    // Add all required fields for the event context
    event.payload.event_context = {
      ...event.payload.event_context,
      callback_url: `${CALLBACK_SERVER_URL}/callback`,
      dev_org: 'test-org',
      dev_org_id: 'test-org-id',
      dev_user: 'test-user',
      dev_user_id: 'test-user-id',
      external_sync_unit: 'test-sync-unit',
      external_sync_unit_id: TEST_PROJECT_ID,
      external_sync_unit_name: 'Test Sync Unit',
      external_system: 'wrike',
      external_system_type: 'wrike',
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
    };
    
    return event;
  }

  // Helper function to wait for callback
  async function waitForCallback(maxWaitTime: number): Promise<void> {
    const checkInterval = 100; // Check every 100ms
    const maxAttempts = maxWaitTime / checkInterval;
    let attempts = 0;
    
    console.log(`Waiting for callback (max ${maxWaitTime}ms)...`);
    
    while (attempts < maxAttempts) {
      if (receivedData.length > 0) {
        console.log(`Received callback after ${attempts * checkInterval}ms`);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      attempts++;
    }
    
    console.warn(`No callback received after ${maxWaitTime}ms`);
  }
});