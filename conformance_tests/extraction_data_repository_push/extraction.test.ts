import axios from 'axios';
import { EventType, ExtractorEventType } from '@devrev/ts-adaas';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import { setupCallbackServer, teardownCallbackServer, waitForEvent, resetEvents, CALLBACK_SERVER_URL, hasReceivedEvent, waitForAnyEventWithTimeout } from './test-utils';
// Environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || '';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || '';
const PROJECT_ID = 'IEAGS6BYI5RFMPPY'; // As specified in requirements

// Server configurations
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';

// Test timeout (reduced to ensure tests complete within the 120 second limit)
jest.setTimeout(120000);

// Validate environment variables
beforeAll(() => {
  if (!WRIKE_API_KEY) throw new Error('WRIKE_API_KEY environment variable is required');
  if (!WRIKE_SPACE_GID) throw new Error('WRIKE_SPACE_GID environment variable is required');
});

describe('Extraction Function Conformance Tests', () => {
  // Setup and teardown the callback server
  beforeAll(async () => setupCallbackServer());
  
  // Reset events before each test
  beforeEach(() => {
    resetEvents();
  });
  afterAll(async () => await teardownCallbackServer());

  // Helper function to create a test event
  const createTestEvent = (eventType: EventType) => {
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
          org_id: WRIKE_SPACE_GID, // Use space ID from environment
          org_name: 'Test Organization',
          key_type: 'api_key'
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/`,
          dev_org: 'test-org',
          dev_org_id: 'test-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          external_sync_unit: PROJECT_ID,
          external_sync_unit_id: PROJECT_ID,
          external_sync_unit_name: 'Test Project',
          external_system: 'wrike',
          external_system_type: 'wrike',
          import_slug: 'test-import',
          mode: 'INITIAL',
          request_id: 'test-request-id',
          snap_in_slug: 'test-snap-in',
          snap_in_version_id: 'test-version-id',
          sync_run: 'test-run',
          sync_run_id: `test-run-id-${Date.now()}`, // Add timestamp to make it unique
          sync_tier: 'test-tier',
          sync_unit: 'test-unit',
          sync_unit_id: 'test-unit-id',
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
  };

  test('Extraction function can be invoked with EXTRACTION_DATA_START event and emits a single DONE event', async () => {
    const event = createTestEvent(EventType.ExtractionDataStart);
    
    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, event, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');    

    try {
      console.log(`[${new Date().toISOString()}] Waiting for EXTRACTION_DATA_DONE event...`);
      
      // Wait for the DONE event with a shorter timeout
      const doneEvent = await waitForEvent(ExtractorEventType.ExtractionDataDone, 45000);
      
      console.log(`[${new Date().toISOString()}] Received EXTRACTION_DATA_DONE event`);
      
      // Wait a short time to ensure no other events arrive
      await setTimeoutPromise(2000);
      
      // Verify we only received one DONE or ERROR event (not both)
      const doneEvents = global.receivedEvents.filter((evt: any) => 
        evt && evt.event_type === ExtractorEventType.ExtractionDataDone
      );
      
      const errorEvents = global.receivedEvents.filter((evt: any) => 
        evt && evt.event_type === ExtractorEventType.ExtractionDataError
      );

      // We should have exactly one DONE event and no ERROR events
      // Expected exactly one DONE event
      expect(doneEvents.length).toBe(1);
      expect(errorEvents.length).toBe(0);
      
      // Check if we received any artifact upload events (optional check)
      const artifactEvents = global.receivedEvents.filter((event: any) => 
        event.file_name && (
          event.file_name.includes('users') || 
          event.file_name.includes('tasks')
        )
      );

      console.log(`Found ${artifactEvents.length} artifact events`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Test failed with error:`, error);
      throw error;
    }
  });
});