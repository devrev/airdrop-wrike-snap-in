import axios from 'axios';
import { ExtractorEventType } from '@devrev/ts-adaas';
import { promises as fs } from 'fs';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import * as path from 'path';
import { setupCallbackServer, teardownCallbackServer, waitForEvent, resetEvents, hasReceivedEvent, waitForAnyEventWithTimeout, CALLBACK_SERVER_URL } from './test-utils';

// Server configurations
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';

// Test timeout (120 seconds as specified in requirements)
jest.setTimeout(60000); // Reduced to ensure tests complete within the overall limit

describe('Data Extraction Acceptance Test', () => {
  // Setup and teardown the callback server
  beforeAll(() => setupCallbackServer());
  
  // Reset events before each test
  beforeEach(() => {
    resetEvents();
  });
  afterAll(() => teardownCallbackServer());

  test('Extraction function processes data and emits a single EXTRACTION_DATA_DONE event', async () => {
    try {
      // Load test data from the resource file with a timeout
      const testDataPath = path.resolve(__dirname, 'resources', 'data_extraction_test.json');
      
      console.log(`[${new Date().toISOString()}] Loading test data from ${testDataPath}`);
      const testDataRaw = await fs.readFile(testDataPath, 'utf8');
      const testData = JSON.parse(testDataRaw);
      
      // Validate test data
      if (!Array.isArray(testData) || testData.length === 0) {
        throw new Error(`Invalid test data: Expected non-empty array, got ${typeof testData}`);
      }
      
      // Get the first event from the test data
      const event = JSON.parse(JSON.stringify(testData[0])); // Deep clone to avoid modifying the original
      
      // Update the callback URL to point to our test server
      if (event.payload && event.payload.event_context) {
        event.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/`;
        
        // Add a unique identifier to prevent caching
        event.payload.event_context.sync_run_id = `test-sync-run-id-${Date.now()}`;
        // Use the specified project ID
        event.payload.event_context.external_sync_unit_id = 'IEAGS6BYI5RFMPPY';
      } else {
        throw new Error('Invalid test data: Missing payload.event_context structure');
      }
      
      // Update the API key and space ID from environment variables
      if (event.payload && event.payload.connection_data) {
        const apiKey = process.env.WRIKE_API_KEY;
        const spaceId = process.env.WRIKE_SPACE_GID;
        
        if (!apiKey) {
          throw new Error('WRIKE_API_KEY environment variable is required');
        }
        
        if (!spaceId) {
          throw new Error('WRIKE_SPACE_GID environment variable is required');
        }
        
        event.payload.connection_data.key = apiKey;
        event.payload.connection_data.org_id = spaceId;
      } else {
        throw new Error('Invalid test data: Missing payload.connection_data structure');
      }
      
      console.log(`[${new Date().toISOString()}] Sending test event to snap-in server`);
      
      // Send request to snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, event, {
        headers: { 'Content-Type': 'application/json' } 
      });
      
      // Verify response
      console.log(`[${new Date().toISOString()}] Received response from snap-in server`);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      // Wait for the EXTRACTION_DATA_DONE event
      console.log(`[${new Date().toISOString()}] Waiting for EXTRACTION_DATA_DONE event...`);
      const doneEvent = await waitForEvent(ExtractorEventType.ExtractionDataDone, 45000);
      
      console.log(`[${new Date().toISOString()}] Received EXTRACTION_DATA_DONE event`);
      
      // Wait a short time to ensure no other DONE events arrive
      await setTimeoutPromise(2000);

      // Check that we received exactly one EXTRACTION_DATA_DONE event
      const doneEvents = global.receivedEvents.filter(e => e && e.event_type === ExtractorEventType.ExtractionDataDone);
      
      if (doneEvents.length !== 1) {
        console.error('Expected exactly one EXTRACTION_DATA_DONE event, but received:', 
          doneEvents.length, 
          'All received events:', 
          JSON.stringify(global.receivedEventTypes, null, 2)
        );
      }

      // Expected exactly one DONE event
      expect(doneEvents.length).toBe(1);
      
      // Check that we didn't receive any error events
      const errorEvents = global.receivedEvents.filter(e => e && e.event_type === ExtractorEventType.ExtractionDataError);
      
      if (errorEvents.length > 0) {
        console.error('Received unexpected error events:', JSON.stringify(errorEvents, null, 2));
      }
      
      expect(errorEvents.length).toBe(0);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Test failed with error:`, error);
      throw error;
    }
  });
});