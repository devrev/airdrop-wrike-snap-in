import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { AddressInfo } from 'net';
import { Server } from 'http';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const PROJECT_ID = process.env.PROJECT_ID || 'IEAGS6BYI5RFMPPY'; // Default project ID for testing

// Timeout for tests (in milliseconds)
jest.setTimeout(120000); // 120 seconds as per requirements

describe('Fetch Tasks Function Tests', () => {
  let callbackServer: Server;
  let callbackData: any = null;

  // Set up callback server and reset callback data before each test
  beforeEach(() => {
    callbackData = null;
    const app = express();
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post('/callback', async (req, res) => {
      callbackData = req.body;
      res.status(200).send({ status: 'success' });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).send({ status: 'up' });
    });

    // Start the server
    callbackServer = app.listen(CALLBACK_SERVER_PORT);
  });

  // Clean up callback server after each test
  afterEach(async () => {
    if (callbackServer) {
      await new Promise<void>((resolve) => {
        callbackServer.close(() => resolve());
      });
    }
  });

  // Helper function to create a valid event payload
  const createEventPayload = (overrides = {}) => {
    // Check for required environment variables
    const apiKey = process.env.WRIKE_API_KEY;
    if (!apiKey) {
      console.error('WRIKE_API_KEY environment variable is required');
    }

    const spaceId = process.env.WRIKE_SPACE_GID;
    if (!spaceId) {
      throw new Error('WRIKE_SPACE_GID environment variable is required');
    }

    return {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_id: 'test-snap-in',
        snap_in_version_id: 'test-version'
      },
      payload: {
        connection_data: {
          key: apiKey,
          org_id: spaceId,
          key_type: 'api_key'
        },
        event_context: {
          external_sync_unit_id: PROJECT_ID,
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        },
        event_type: 'EXTRACTION_DATA_START'
      },
      execution_metadata: {
        devrev_endpoint: 'http://localhost:8003',
        function_name: 'fetch_tasks',
      },
      input_data: {}
    };
  };

  // Add afterAll to ensure all connections are closed
  afterAll(() => jest.setTimeout(5000));

  // Test 1: Basic - Verify the function can be called and returns a response
  test('should successfully call the fetch_tasks function', async () => {
    const payload = createEventPayload();

    // Verify callback server is running
    try {
      await axios.get(`${CALLBACK_SERVER_URL}/health`);
      console.log('Callback server is running');
    } catch (error) {
      console.error('Callback server is not running:', error);
    }

    const response = await axios.post(TEST_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
  });

  // Test 2: Input Validation - Test with invalid inputs
  test('should handle missing API key gracefully', async () => {
    const payload = createEventPayload();
    // Remove the API key
    payload.payload.connection_data.key = '';
    
    const response = await axios.post(TEST_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('error');
    expect(response.data.function_result.error).toBeDefined();
  });

  // Test 3: Functional - Test with valid inputs
  test('should fetch tasks from Wrike API', async () => {
    const payload = createEventPayload();
    
    const response = await axios.post(TEST_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.tasks).toBeDefined();
    expect(Array.isArray(response.data.function_result.tasks)).toBe(true);
    
    // If tasks were returned, verify they have the expected structure
    if (response.data.function_result.tasks.length > 0) {
      const firstTask = response.data.function_result.tasks[0];
      expect(firstTask.id).toBeDefined();
      expect(firstTask.title).toBeDefined();
      expect(firstTask.status).toBeDefined();
      expect(firstTask.created_date).toBeDefined();
      expect(firstTask.updated_date).toBeDefined();
    }
  });

  // Test 4: Edge Cases - Test with invalid project ID
  test('should handle invalid project ID gracefully', async () => {
    const payload = createEventPayload();
    // Set an invalid project ID
    payload.payload.event_context.external_sync_unit_id = 'invalid-project-id';
    
    const response = await axios.post(TEST_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    // The function should either return an error status or an empty tasks array
    if (response.data.function_result.status === 'error') {
      expect(response.data.function_result.error).toBeDefined();
    } else {
      expect(response.data.function_result.tasks).toBeDefined();
      expect(Array.isArray(response.data.function_result.tasks)).toBe(true);
    }
  });
});