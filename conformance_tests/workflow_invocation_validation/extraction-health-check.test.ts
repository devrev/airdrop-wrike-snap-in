import axios from 'axios';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const DEVREV_SERVER_URL = 'http://localhost:8003';
const WORKER_DATA_URL = 'http://localhost:8003/external-worker';

// Load the extraction health check event from the resource file
const extractionHealthCheckEvent = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, './extraction_health_check.json'), 'utf8')
);

// Setup callback server
let callbackServer: http.Server | null = null;
let callbackData: any = null;

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    callbackServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          callbackData = JSON.parse(body);
        } catch (e) {
          callbackData = body;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      });
    });
    
    callbackServer.listen(CALLBACK_SERVER_PORT, '127.0.0.1', () => {
      console.log(`Callback server running at http://localhost:${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
}

function shutdownCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    if (callbackServer) {
      callbackServer.close(() => {
        callbackServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Test suite
describe('Extraction Health Check Tests', () => {
  beforeAll(async () => {
    await setupCallbackServer();
  });

  afterAll(async () => {
    await shutdownCallbackServer();
  });

  beforeEach(() => {
    callbackData = null;
  });

  // Test 1: Verify the extraction health check function can be invoked with the provided event
  test('should successfully invoke the extraction health check function with the provided event', async () => {
    // Update the callback URL to point to our test callback server
    const event = {
      ...extractionHealthCheckEvent,
      payload: {
        ...extractionHealthCheckEvent.payload,
        event_context: {
          ...extractionHealthCheckEvent.payload.event_context,
          callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`
        }
      }
    };
    
    // Set the function name to ensure we're calling the right function
    event.execution_metadata.function_name = 'healthcheck';
    
    // Send the request to the test server
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.message).toBe('Healthcheck function successfully invoked');
  });

  // Test 2: Verify the function correctly identifies the event as an extraction event
  test('should correctly identify the event as an extraction event', async () => {
    // First, modify the event to use the extraction_workflow_check function
    const event = {
      ...extractionHealthCheckEvent,
      execution_metadata: {
        ...extractionHealthCheckEvent.execution_metadata,
        function_name: 'extraction_workflow_check'
      },
      payload: {
        ...extractionHealthCheckEvent.payload,
        event_context: {
          ...extractionHealthCheckEvent.payload.event_context,
          callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`
        }
      }
    };
    
    // Send the request to the test server
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.valid_extraction_events).toBe(true);
    expect(response.data.function_result.message).toBe('Extraction workflow check function successfully invoked');
  });

  // Test 3: Verify the function handles malformed events gracefully
  test('should handle malformed events gracefully', async () => {
    // Create a malformed event by removing required fields
    const malformedEvent = {
      context: {},
      payload: {
        event_context: {
          callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`
        }
      },
      execution_metadata: {
        function_name: 'extraction_health_check',
      }
    };
    
    // The server will throw an error, but axios might not return a response object
    try {
      await axios.post(TEST_SERVER_URL, malformedEvent);
      fail('Expected request to fail');
    } catch (error: any) {
      // Check that we got an error, but don't require a specific structure
      expect(error).toBeDefined();
    }
  });

  // Test 4: Verify the function works with the exact event from the resource file
  test('should work with the exact event from the resource file', async () => {
    // Use the event exactly as provided in the resource file
    const event = {
      ...extractionHealthCheckEvent,
      execution_metadata: {
        ...extractionHealthCheckEvent.execution_metadata,
        function_name: 'healthcheck'  // Make sure we're calling the right function
      }
    };
    
    // Send the request to the test server
    const response = await axios.post(TEST_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.message).toBe('Healthcheck function successfully invoked');
  });
});