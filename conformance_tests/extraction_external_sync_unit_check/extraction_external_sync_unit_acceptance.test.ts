import axios from 'axios';
import express, { Request, Response } from 'express';
import { Server } from 'http';
import fs from 'fs';
import path from 'path';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const DEVREV_SERVER_URL = 'http://localhost:8003';
const WORKER_DATA_URL = `${DEVREV_SERVER_URL}/external-worker`;
const TEST_TIMEOUT = 60000; // 60 seconds timeout for the test

describe('Extraction External Sync Unit Acceptance Test', () => {
  let callbackServer: Server;
  let callbackReceived = false;
  let receivedEventType: string | null = null;
  let callbackPromiseResolve: ((value: unknown) => void) | null = null;
  let callbackPromiseReject: ((reason?: any) => void) | null = null;
  let callbackPromise: Promise<unknown>;

  // Setup callback server before all tests
  beforeAll((done) => {
    const app = express();
    app.use(express.json());

    // Create a route to handle callbacks from DevRev
    app.post('/callback', (req: Request, res: Response) => {
      console.log('Callback received:', JSON.stringify(req.body, null, 2));
      
      // Extract the event_type from the callback payload
      const eventType = req.body?.event_type;
      console.log(`Received event_type: ${eventType}`);
      
      // Store the received event type for later assertion
      receivedEventType = eventType;
      callbackReceived = true;
      
      // Resolve the promise if we're waiting for this callback
      if (callbackPromiseResolve) {
        callbackPromiseResolve(req.body);
      }
      
      res.status(200).send({ status: 'success' });
    });

    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at http://localhost:${CALLBACK_SERVER_PORT}`);
      done();
    });
  });

  // Cleanup callback server after all tests
  afterAll((done) => {
    callbackServer.close(() => {
      console.log('Callback server closed');
      done();
    });
  });

  // Reset callback flags before each test
  beforeEach(() => {
    callbackReceived = false;
    receivedEventType = null;
    
    // Create a new promise that will be resolved when the callback is received
    callbackPromise = new Promise((resolve, reject) => {
      callbackPromiseResolve = resolve;
      callbackPromiseReject = reject;
      
      // Set a timeout to reject the promise if no callback is received
      setTimeout(() => {
        if (!callbackReceived && callbackPromiseReject) {
          callbackPromiseReject(new Error('Timeout waiting for callback from DevRev'));
        }
      }, TEST_TIMEOUT - 5000); // 5 seconds before the test timeout
    });
  });

  test('should receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event from DevRev', async () => {
    // Load the test event from the JSON file
    let testEvents;
    try {
      const jsonPath = path.resolve(__dirname, './external_sync_unit_check.json');
      console.log(`Loading test events from: ${jsonPath}`);
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      testEvents = JSON.parse(jsonData);
      console.log(`Loaded ${testEvents.length} test events`);
    } catch (error) {
      console.error('Error loading test events:', error);
      throw new Error(`Failed to load test events: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Ensure we have at least one event
    expect(testEvents).toBeDefined();
    expect(Array.isArray(testEvents)).toBe(true);
    expect(testEvents.length).toBeGreaterThan(0);

    // Get the first event
    const testEvent = testEvents[0];
    
    // Ensure the event has the required structure
    expect(testEvent).toHaveProperty('payload');
    expect(testEvent.payload).toHaveProperty('event_context');
    expect(testEvent.payload.event_context).toHaveProperty('callback_url');
    
    // Update the callback URL to point to our test server
    testEvent.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    
    // Ensure the event has the correct event_type
    expect(testEvent.payload).toHaveProperty('event_type');
    expect(testEvent.payload.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Ensure the event has the correct function_name
    expect(testEvent.execution_metadata).toHaveProperty('function_name');
    expect(testEvent.execution_metadata.function_name).toBe('extraction_external_sync_unit_check');
    
    // Update the devrev_endpoint to point to our test server
    testEvent.execution_metadata.devrev_endpoint = DEVREV_SERVER_URL;
    
    // Update the worker_data_url to point to our test server
    testEvent.payload.event_context.worker_data_url = WORKER_DATA_URL;
    
    console.log('Sending test event to snap-in server:', JSON.stringify(testEvent, null, 2));
    
    try {
      // Send the event to the snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, testEvent, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Response from snap-in server:', JSON.stringify(response.data, null, 2));
      
      // Check if the response contains an error
      if (response.data?.error) {
        console.error('Error in response:', response.data.error);
        throw new Error(`Error in response: ${JSON.stringify(response.data.error)}`);
      }
      
      // Wait for the callback to be received
      console.log('Waiting for callback from DevRev...');
      await callbackPromise;
      
      // Assert that we received a callback
      expect(callbackReceived).toBe(true);
      expect(receivedEventType).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
      
    } catch (error) {
      console.error('Test failed:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw error;
    }
  }, TEST_TIMEOUT);
});

// Add a global afterAll hook to ensure all connections are closed
afterAll(async () => {
  // Ensure we don't leave any open connections
  if (axios.defaults.httpAgent && typeof axios.defaults.httpAgent.destroy === 'function') {
    axios.defaults.httpAgent.destroy();
  }
  if (axios.defaults.httpsAgent && typeof axios.defaults.httpsAgent.destroy === 'function') {
    axios.defaults.httpsAgent.destroy();
  }
  await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for connections to close
});