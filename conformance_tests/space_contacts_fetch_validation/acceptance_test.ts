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

// Acceptance Test
describe('Acceptance Test: fetch_contacts function', () => {
  beforeAll(async () => {
    await setupCallbackServer();
  });

  afterAll(async () => {
    await shutdownCallbackServer();
  });

  beforeEach(() => {
    lastCallbackData = null;
  });

  test('should return exactly 5 members with required fields when using test credentials', async () => {
    // Create the event payload with test credentials
    const payload = createEventPayload();
    
    // Invoke the function
    const result = await invokeFetchContacts(payload);
    
    // Log the result for debugging purposes
    console.log('Function result status:', result.function_result?.status);
    console.log('Number of contacts returned:', result.function_result?.contacts?.length);
    
    // Verify the response structure
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('success');
    
    // Verify that contacts array exists and has exactly 5 members
    expect(result.function_result.contacts).toBeDefined();
    expect(Array.isArray(result.function_result.contacts)).toBe(true);
    
    if (!result.function_result.contacts || !Array.isArray(result.function_result.contacts)) {
      console.error('Contacts is not an array:', result.function_result.contacts);
      throw new Error('Contacts is not an array');
    }
    
    // Check that exactly 5 contacts are returned
    expect(result.function_result.contacts.length).toBe(5);
    
    // Verify that each contact has the required fields
    result.function_result.contacts.forEach((contact: any, index: number) => {
      // Log contact for debugging
      console.log(`Contact ${index + 1}:`, JSON.stringify(contact, null, 2));
      
      // Check required fields
      expect(contact.id).toBeDefined();
      expect(typeof contact.id).toBe('string');
      expect(contact.first_name).toBeDefined();
      expect(contact.last_name).toBeDefined();
      
      // Check that at least one profile with email exists
      expect(contact.profiles).toBeDefined();
      expect(Array.isArray(contact.profiles)).toBe(true);
      
      // At least one profile should have an email
      const hasEmail = contact.profiles.some((profile: any) => profile.email);
      expect(hasEmail).toBe(true);
      
      if (!hasEmail) {
        console.error(`Contact ${index + 1} does not have an email:`, contact);
      }
    });
  }, 30000); // 30 seconds timeout
});