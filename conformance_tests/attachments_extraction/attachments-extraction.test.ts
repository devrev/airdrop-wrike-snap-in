import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY';

// Environment variables validation
const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID;

if (!WRIKE_API_KEY) {
  throw new Error('WRIKE_API_KEY environment variable is required');
}

if (!WRIKE_SPACE_GID) {
  throw new Error('WRIKE_SPACE_GID environment variable is required');
}

// Callback server setup
let callbackServer: Server;
let receivedCallbacks: any[] = [];

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    app.post('*', (req, res) => {
      console.log('Callback received:', req.path);
      receivedCallbacks.push({
        path: req.path,
        body: req.body,
        timestamp: new Date().toISOString()
      });
      res.status(200).send({ success: true });
    });

    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
}

// Create event payload for testing
function createAttachmentExtractionEvent(eventType: string) {
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
      event_type: eventType,
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
      }
    }
  };
}

describe('Attachments Extraction Tests', () => {
  beforeAll(async () => {
    await setupCallbackServer();
  });

  afterAll(() => {
    if (callbackServer) {
      callbackServer.close();
    }
  });

  beforeEach(() => {
    receivedCallbacks = [];
  });

  test('Should reject event with missing required fields', async () => {
    const invalidEvent = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        function_name: 'extraction'
      },
      input_data: {},
      payload: {
        event_type: 'EXTRACTION_ATTACHMENTS_START'
        // Missing connection_data and event_context
      }
    };

    const response = await axios.post(SNAP_IN_SERVER_URL, invalidEvent, {
      validateStatus: () => true
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('missing required');
  });

  test('Should handle EXTRACTION_ATTACHMENTS_START event', async () => {
    const event = createAttachmentExtractionEvent('EXTRACTION_ATTACHMENTS_START');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Attachments extraction completed successfully');
    
    // Wait for callbacks to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify that at least one callback was received
    expect(receivedCallbacks.length).toBeGreaterThan(0);
  });

  test('Should handle EXTRACTION_ATTACHMENTS_CONTINUE event', async () => {
    const event = createAttachmentExtractionEvent('EXTRACTION_ATTACHMENTS_CONTINUE');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Attachments extraction completed successfully');
    
    // Wait for callbacks to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify that at least one callback was received
    expect(receivedCallbacks.length).toBeGreaterThan(0);
  });
});