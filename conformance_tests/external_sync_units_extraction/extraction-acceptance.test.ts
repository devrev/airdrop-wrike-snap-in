import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

// Configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 60000; // 60 seconds for the test
const CALLBACK_WAIT_TIMEOUT = 30000; // 30 seconds to wait for callback

// Read environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || '';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || '';

// Validate environment variables
if (!WRIKE_API_KEY) {
  console.error('WRIKE_API_KEY environment variable is required');
  process.exit(1);
}

if (!WRIKE_SPACE_GID) {
  console.error('WRIKE_SPACE_GID environment variable is required');
  process.exit(1);
}

describe('Extraction Function Acceptance Test', () => {
  let callbackServer: Server;
  let receivedCallbacks: any[] = [];

  // Setup callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post('/callback', (req, res) => {
      console.log('Callback received:', JSON.stringify(req.body));
      receivedCallbacks.push(req.body);
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

  // Reset received callbacks before each test
  beforeEach(() => {
    receivedCallbacks = [];
  });

  test('should process external sync units extraction and receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event', async () => {
    // Load the test event data from the resource file
    const testEventData = loadTestEventData();
    expect(testEventData).toBeTruthy();
    
    if (!testEventData) {
      throw new Error('Failed to load test event data');
    }

    // Replace placeholders with actual values
    const event = replaceEventPlaceholders(testEventData[0]);
    
    console.log('Sending event to test server:', JSON.stringify(event));
    
    // Send the event to the test server
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    
    console.log('Response from test server:', JSON.stringify(response.data));
    
    // Wait for the callback
    const callbackReceived = await waitForCallback(CALLBACK_WAIT_TIMEOUT);
    expect(callbackReceived).toBe(true);
    
    // Verify exactly one callback was received
    expect(receivedCallbacks.length).toBe(1);
    
    // Verify the callback has the correct event type
    const callback = receivedCallbacks[0];
    expect(callback.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    
    // Verify the callback has external sync units
    expect(callback.event_data).toBeDefined();
    expect(callback.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callback.event_data.external_sync_units)).toBe(true);
    
    // Log the external sync units for debugging
    console.log(`Received ${callback.event_data.external_sync_units.length} external sync units`);
    
    // Verify the structure of external sync units
    if (callback.event_data.external_sync_units.length > 0) {
      const firstUnit = callback.event_data.external_sync_units[0];
      expect(firstUnit.id).toBeDefined();
      expect(firstUnit.name).toBeDefined();
      expect(firstUnit.description).toBeDefined();
    }
  }, TEST_TIMEOUT);

  // Helper function to load test event data
  function loadTestEventData(): any[] | null {
    try {
      // The resource file should be in the same directory as the test
      const filePath = path.resolve(__dirname, 'external_sync_unit_check.json');
      
      if (!fs.existsSync(filePath)) {
        console.error(`Test event data file not found at: ${filePath}`);
        return null;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error loading test event data:', error);
      return null;
    }
  }

  // Helper function to replace placeholders in the event data
  function replaceEventPlaceholders(event: any): any {
    // Create a deep copy of the event to avoid modifying the original
    const modifiedEvent = JSON.parse(JSON.stringify(event));
    
    // Set the callback URL to point to our callback server
    if (modifiedEvent.payload && modifiedEvent.payload.event_context) {
      modifiedEvent.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    }
    
    // Replace API key and Space ID in connection_data
    if (modifiedEvent.payload && modifiedEvent.payload.connection_data) {
      modifiedEvent.payload.connection_data.key = WRIKE_API_KEY;
      modifiedEvent.payload.connection_data.org_id = WRIKE_SPACE_GID;
    }
    
    return modifiedEvent;
  }

  // Helper function to wait for callback with timeout
  async function waitForCallback(maxWaitTime: number): Promise<boolean> {
    const checkInterval = 500; // Check every 500ms
    const maxAttempts = maxWaitTime / checkInterval;
    let attempts = 0;
    
    console.log(`Waiting for callback (max ${maxWaitTime}ms)...`);
    
    while (attempts < maxAttempts) {
      if (receivedCallbacks.length > 0) {
        console.log(`Received callback after ${attempts * checkInterval}ms`);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      attempts++;
    }
    
    console.error(`No callback received after ${maxWaitTime}ms`);
    return false;
  }
});