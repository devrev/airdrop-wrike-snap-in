import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import http, { Server } from 'http';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_PATH = '/callback';
const RESOURCE_FILE = 'external_sync_unit_check.json';

describe('Acceptance Test - External Sync Unit Check', () => {
  let callbackServer: Server;
  let callbackUrl: string;
  let callbackData: any[] = [];
  let testEvent: any;

  // Set up callback server before tests
  beforeAll((done) => {
    // Load the test event from the resource file
    try {
      const resourceData = fs.readFileSync(RESOURCE_FILE, 'utf8');
      testEvent = JSON.parse(resourceData);
      console.log('Successfully loaded test event from resource file');
    } catch (error) {
      console.error('Failed to load test event from resource file:', error);
      // Create the test event directly if file can't be loaded
      testEvent = {
        "execution_metadata": {
            "function_name": "extraction_external_sync_unit_check",
            "devrev_endpoint": "http://localhost:8003"
        },
        "payload" : {
            "event_type": "EXTRACTION_EXTERNAL_SYNC_UNITS_START",
            "event_context": {
                "callback_url": "http://localhost:8002/callback",
                "dev_org": "test-dev-org",
                "external_sync_unit_id": "test-external-sync-unit",
                "sync_unit_id": "test-sync-unit",
                "worker_data_url": "http://localhost:8003/external-worker"
            },
            "connection_data": {
                "org_id": "test-org-id",
                "key": "test-key"
            }
        },
        "context": {
            "secrets": {
                "service_account_token": "test-token"
            }
        }
      };
      console.log('Created test event directly in code');
    }

    const app = express(); 
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post(CALLBACK_PATH, (req, res) => {
      console.log('Callback received:', JSON.stringify(req.body));
      callbackData.push(req.body);
      res.status(200).send({ status: 'success' });
    });

    // Start the callback server
    callbackServer = http.createServer(app);
    callbackServer.listen(CALLBACK_SERVER_PORT, '0.0.0.0', () => {
      const address = callbackServer.address() as AddressInfo;
      callbackUrl = `http://localhost:${address.port}${CALLBACK_PATH}`;
      console.log(`Callback server listening at ${callbackUrl}`);
      
      // Update the callback URL in the test event
      if (testEvent && testEvent.payload && testEvent.payload.event_context) {
        testEvent.payload.event_context.callback_url = callbackUrl;
        console.log('Updated callback URL in test event');
      }
      
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

  test('should receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event from DevRev', async () => {
    // Verify the test event is properly loaded
    expect(testEvent).toBeDefined();
    expect(testEvent.payload).toBeDefined();
    expect(testEvent.payload.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    console.log('Sending test event to function endpoint...');
    
    // Call the function with the test event
    const response = await axios.post(TEST_SERVER_URL, testEvent);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    console.log('Function response:', JSON.stringify(response.data));
    
    // Wait for callback to be received (up to 10 seconds)
    console.log('Waiting for callback event...');
    await waitForCallback(10000);
    
    // Verify callback data was received
    expect(callbackData.length).toBeGreaterThan(0, 'No callback data received within timeout period');
    
    // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
    const syncUnitsDoneEvent = callbackData.find(
      data => data.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE'
    );
    
    // Verify the event was received
    expect(syncUnitsDoneEvent).toBeDefined('Did not receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event');
    
    // Verify the event structure
    expect(syncUnitsDoneEvent.event_data).toBeDefined('Event data is missing');
    expect(syncUnitsDoneEvent.event_data.external_sync_units).toBeDefined('External sync units are missing');
    expect(Array.isArray(syncUnitsDoneEvent.event_data.external_sync_units)).toBe(true, 'External sync units is not an array');
    expect(syncUnitsDoneEvent.event_data.external_sync_units.length).toBeGreaterThan(0, 'External sync units array is empty');
    
    // Log all received events for debugging
    console.log('All received callback events:', JSON.stringify(callbackData));
    
    // Verify the structure of external sync units
    const externalSyncUnit = syncUnitsDoneEvent.event_data.external_sync_units[0];
    expect(externalSyncUnit.id).toBeDefined('External sync unit id is missing');
    expect(externalSyncUnit.name).toBeDefined('External sync unit name is missing');
    expect(externalSyncUnit.description).toBeDefined('External sync unit description is missing');
  });

  // Helper function to wait for callback data
  async function waitForCallback(timeout: number): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms
    
    while (Date.now() - startTime < timeout) {
      if (callbackData.length > 0) {
        // Check if we have the specific event we're looking for
        const hasTargetEvent = callbackData.some(
          data => data.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE'
        );
        
        if (hasTargetEvent) {
          console.log('Received target event within', Date.now() - startTime, 'ms');
          return;
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    console.warn(`Timeout reached after ${timeout}ms. Received ${callbackData.length} callbacks, but not the target event.`);
  }
});