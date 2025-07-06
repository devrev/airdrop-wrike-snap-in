import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 10000; // 10 seconds per test

// Environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID;
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY'; // Project ID for testing

// Setup callback server
let callbackServer: Server;
let callbackData: any = null;

beforeAll(async () => {
  // Check required environment variables
  if (!WRIKE_API_KEY) {
    throw new Error('WRIKE_API_KEY environment variable is required');
  }
  if (!WRIKE_SPACE_GID) {
    throw new Error('WRIKE_SPACE_GID environment variable is required');
  }

  // Setup callback server
  const app = express();
  app.use(bodyParser.json());
  
  app.post('*', (req, res) => {
    callbackData = req.body;
    res.status(200).send({ status: 'ok' });
  });
  
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      resolve();
    });
  });
});

afterAll(() => {
  // Close callback server
  if (callbackServer) {
    callbackServer.close();
  }
});

beforeEach(() => {
  // Reset callback data before each test
  callbackData = null;
});

// Helper function to create a basic event payload
function createEventPayload(projectId?: string) {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      function_name: 'fetch_wrike_tasks',
      request_id: 'test-request-id',
      event_type: 'test-event',
      devrev_endpoint: 'http://localhost:8003'
    },
    payload: {
      connection_data: {
        key: WRIKE_API_KEY,
        org_id: WRIKE_SPACE_GID
      },
      event_context: {
        external_sync_unit_id: projectId,
        callback_url: `${CALLBACK_SERVER_URL}/callback`
      }
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

describe('fetch_wrike_tasks function', () => {
  // Test 1: Basic Request Structure Test
  test('should accept properly formatted requests', async () => {
    const response = await axios.post(TEST_SERVER_URL, createEventPayload(TEST_PROJECT_ID));
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  }, TEST_TIMEOUT);

  // Test 2: Authentication Test
  test('should handle API authentication correctly', async () => {
    // Create payload with invalid API key
    const payload = createEventPayload(TEST_PROJECT_ID);
    payload.payload.connection_data.key = 'invalid-api-key';
    
    const response = await axios.post(TEST_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Error fetching Wrike tasks');
  }, TEST_TIMEOUT);

  // Test 3: Missing Project ID Test
  test('should handle missing project ID gracefully', async () => {
    // Create payload without project ID
    const payload = createEventPayload(undefined);
    
    const response = await axios.post(TEST_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Project ID is missing');
  }, TEST_TIMEOUT);

  // Test 4: Invalid Project ID Test
  test('should handle invalid project ID gracefully', async () => {
    // Create payload with invalid project ID
    const payload = createEventPayload('invalid-project-id');
    
    const response = await axios.post(TEST_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Invalid project ID');
  }, TEST_TIMEOUT);

  // Test 5: Successful Task Fetching Test
  test('should successfully fetch tasks with valid inputs', async () => {
    const response = await axios.post(TEST_SERVER_URL, createEventPayload(TEST_PROJECT_ID));
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Successfully fetched');
    expect(response.data.function_result.tasks).toBeDefined();
    expect(Array.isArray(response.data.function_result.tasks)).toBe(true);
  }, TEST_TIMEOUT);
});