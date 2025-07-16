import axios from 'axios';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as fs from 'fs';
import * as path from 'path';
import { Server } from 'http';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds per test
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const DEVREV_SERVER_URL = 'http://localhost:8003';

// Environment variables
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

// Setup callback server
let callbackServer: Server;
let receivedCallbacks: any[] = [];

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express.default();
    app.use(bodyParser.json());
    
    // Log all incoming requests for debugging
    app.use((req, res, next) => {
      console.log(`Callback server received ${req.method} request to ${req.url}`);
      next();
    });
    
    app.post('/callback', (req, res) => {
      console.log('Callback received:', JSON.stringify(req.body, null, 2));
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

// Helper function to load and prepare test event
function loadTestEvent(): any {
  try {
    // Read the test event from the JSON file
    const filePath = path.resolve(__dirname, 'external_sync_unit_check.json');
    console.log(`Loading test event from ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test event file not found at ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const events = JSON.parse(fileContent);
    
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('Invalid test event format: expected non-empty array');
    }
    
    // Use the first event
    const event = events[0];
    
    // Replace placeholders with actual values
    if (event.payload && event.payload.connection_data) {
      event.payload.connection_data.key = WRIKE_API_KEY;
      event.payload.connection_data.org_id = WRIKE_SPACE_GID;
    }
    
    // Set the callback URL
    if (event.payload && event.payload.event_context) {
      event.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
      event.payload.event_context.worker_data_url = `${DEVREV_SERVER_URL}/external-worker`;
    }
    
    return event;
  } catch (error) {
    console.error('Error loading test event:', error);
    throw error;
  }
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

// Test case
describe('Extraction External Sync Unit Test', () => {
  test('should process external sync unit check event and emit EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', async () => {
    // Load and prepare the test event
    const event = loadTestEvent();
    console.log('Prepared test event:', JSON.stringify(event, null, 2));
    
    // Send the event to the snap-in server
    console.log(`Sending event to ${SNAP_IN_SERVER_URL}`);
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
    console.log('Received response:', JSON.stringify(response.data, null, 2));
    
    // Wait for the callback to be received (up to 15 seconds)
    console.log('Waiting for callback...');
    for (let i = 0; i < 15; i++) {
      if (receivedCallbacks.length > 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Verify we received exactly one callback
    expect(receivedCallbacks.length).toBe(1);
    console.log(`Received ${receivedCallbacks.length} callbacks`);
    
    // Verify the callback is the expected DONE event
    const callback = receivedCallbacks[0];
    expect(callback.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    console.log(`Received event_type: ${callback.event_type}`);
    
    // Verify the callback contains external sync units
    expect(callback.event_data).toBeDefined();
    expect(callback.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callback.event_data.external_sync_units)).toBe(true);
    expect(callback.event_data.external_sync_units.length).toBeGreaterThan(0);
    console.log(`Received ${callback.event_data.external_sync_units.length} external sync units`);
    
    // Verify the structure of the external sync units
    const firstUnit = callback.event_data.external_sync_units[0];
    expect(firstUnit.id).toBeDefined();
    expect(firstUnit.name).toBeDefined();
    expect(firstUnit.description).toBeDefined();
    expect(firstUnit.item_type).toBe('tasks');
    
    console.log('Test completed successfully');
  }, TEST_TIMEOUT);
});