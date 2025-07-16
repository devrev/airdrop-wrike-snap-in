import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Get environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || '';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || 'IEAGS6BYI5RFMPPY'; // Default space ID for testing

// Validate environment variables
if (!WRIKE_API_KEY) {
  console.error('WRIKE_API_KEY environment variable is required');
  process.exit(1);
}

// Setup callback server
let callbackServer: Server;
let lastCallbackData: any = null;

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());
    
    app.post('/callback', (req, res) => {
      lastCallbackData = req.body;
      res.status(200).send({ status: 'success' });
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      resolve();
    });
  });
}

function shutdownCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    if (callbackServer) {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Helper function to create a valid event payload
function createEventPayload(overrides: any = {}) {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id'
    },
    payload: {
      connection_data: {
        key: WRIKE_API_KEY,
        org_id: WRIKE_SPACE_GID,
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`
      }
    },
    execution_metadata: {
      function_name: 'fetch_contacts',
      devrev_endpoint: 'http://localhost:8003'
    },
    ...overrides
  };
}

// Helper function to invoke the function
async function invokeFetchContacts(payload: any) {
  try {
    const response = await axios.post(TEST_SERVER_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Error response:', error.response.data);
      return { error: error.response.data };
    }
    throw error;
  }
}

// Tests
describe('fetch_contacts function', () => {
  beforeAll(async () => {
    await setupCallbackServer();
  });

  afterAll(async () => {
    await shutdownCallbackServer();
  });

  beforeEach(() => {
    lastCallbackData = null;
  });

  // Test 1: Basic Invocation
  test('should be invokable with valid input', async () => {
    const payload = createEventPayload();
    const result = await invokeFetchContacts(payload);
    
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.function_result).toBeDefined();
  }, 30000);

  // Test 2: Input Validation
  test('should validate required input parameters', async () => {
    // Missing connection_data
    const invalidPayload = createEventPayload({
      payload: {
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        }
      }
    });
    
    const result = await invokeFetchContacts(invalidPayload);
    
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('error');
    expect(result.function_result.message).toContain('missing required field');
  });

  // Test 3: Authentication Test
  test('should authenticate with Wrike API using provided API key', async () => {
    // Use an invalid API key to test authentication failure
    const invalidAuthPayload = createEventPayload({
      payload: {
        connection_data: {
          key: 'invalid-api-key',
          org_id: WRIKE_SPACE_GID,
          key_type: 'api_key'
        }
      }
    });
    
    const result = await invokeFetchContacts(invalidAuthPayload);
    
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('error');
    expect(result.function_result.error).toBeDefined();
    // The error should indicate an authentication issue (401 Unauthorized)
    expect(result.function_result.error).toMatch(/API request failed|status 4|Unauthorized|Request failed with status code 401/i);
  }, 30000);

  // Test 4: Successful Contacts Retrieval
  test('should successfully fetch contacts from a space', async () => {
    const payload = createEventPayload();
    const result = await invokeFetchContacts(payload);
    
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('success');
    expect(result.function_result.contacts).toBeDefined();
    expect(Array.isArray(result.function_result.contacts)).toBe(true);
    
    // If contacts were found, verify their structure
    if (result.function_result.contacts.length > 0) {
      const firstContact = result.function_result.contacts[0];
      expect(firstContact.id).toBeDefined();
      expect(typeof firstContact.id).toBe('string');
      expect(firstContact.first_name).toBeDefined();
      expect(firstContact.last_name).toBeDefined();
      expect(firstContact.type).toBeDefined();
    }
  }, 30000);

  // Test 5: Error Handling
  test('should handle API errors gracefully', async () => {
    // Use a non-existent space ID to trigger an API error
    const invalidSpacePayload = createEventPayload({
      payload: {
        connection_data: {
          key: WRIKE_API_KEY,
          org_id: 'non-existent-space-id',
          key_type: 'api_key'
        }
      }
    });
    
    const result = await invokeFetchContacts(invalidSpacePayload);
    
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('error');
    expect(result.function_result.error).toBeDefined();
  }, 30000);
});