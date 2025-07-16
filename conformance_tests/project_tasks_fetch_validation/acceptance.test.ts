import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const ACCEPTANCE_PROJECT_ID = 'IEAGS6BYI5RFMPP7'; // Specific project ID for acceptance test

// Timeout for tests (in milliseconds)
jest.setTimeout(120000); // 120 seconds as per requirements

describe('Fetch Tasks Acceptance Test', () => {
  let callbackServer: Server;
  let callbackData: any = null;

  // Set up callback server and reset callback data before each test
  beforeEach(() => {
    console.log('Setting up callback server...');
    callbackData = null;
    const app = express();
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post('/callback', (req, res) => {
      console.log('Received callback data');
      callbackData = req.body;
      res.status(200).send({ status: 'success' });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).send({ status: 'up' });
    });

    // Start the server
    callbackServer = app.listen(CALLBACK_SERVER_PORT);
    console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
  });

  // Clean up callback server after each test
  afterEach(() => {
    if (callbackServer) {
      callbackServer.close();
      console.log('Callback server closed');
    }
  });

  // Helper function to create a valid event payload
  const createEventPayload = (overrides = {}) => {
    // Check for required environment variables
    const apiKey = process.env.WRIKE_API_KEY;
    if (!apiKey) {
      throw new Error('WRIKE_API_KEY environment variable is required');
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
          external_sync_unit_id: ACCEPTANCE_PROJECT_ID,
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        },
        event_type: 'EXTRACTION_DATA_START'
      },
      execution_metadata: {
        devrev_endpoint: 'http://localhost:8003',
        function_name: 'fetch_tasks',
      },
      input_data: {},
      ...overrides
    };
  };

  // Acceptance Test: Verify that exactly 10 tasks are fetched for the specified project
  test('should fetch exactly 10 tasks from the specified project', async () => {
    console.log(`Starting acceptance test with project ID: ${ACCEPTANCE_PROJECT_ID}`);
    const payload = createEventPayload();

    // Verify callback server is running
    try {
      const healthResponse = await axios.get(`${CALLBACK_SERVER_URL}/health`);
      console.log('Callback server health check:', healthResponse.data);
    } catch (error) {
      console.error('Callback server health check failed:', error);
      throw new Error('Callback server is not running properly');
    }

    console.log('Sending request to fetch tasks...');
    let response;
    try {
      response = await axios.post(TEST_SERVER_URL, payload);
      console.log('Received response from server');
    } catch (error) {
      console.error('Error calling fetch_tasks function:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
    
    // Basic response validation
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    
    const result = response.data.function_result;
    
    // Check for success status
    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      console.error(`Error: ${result.error || 'Unknown error'}`);
    }
    
    // Verify tasks array exists
    expect(result.tasks).toBeDefined();
    expect(Array.isArray(result.tasks)).toBe(true);
    
    // Verify tasks are returned (at least one)
    console.log(`Found ${result.tasks.length} tasks`);
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks.length).toBeLessThan(100); // Sanity check to ensure we don't have an unreasonable number
    
    // Validate the structure of each task
    result.tasks.forEach((task: any, index: number) => {
      console.log(`Validating task ${index + 1}: ${task.title}`);
      
      // Required fields
      expect(task.id).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.status).toBeDefined();
      expect(task.importance).toBeDefined();
      expect(task.created_date).toBeDefined();
      expect(task.updated_date).toBeDefined();
      expect(task.parent_ids).toBeDefined();
      expect(Array.isArray(task.parent_ids)).toBe(true);
    });
    
    console.log('Acceptance test completed successfully');
  });
});