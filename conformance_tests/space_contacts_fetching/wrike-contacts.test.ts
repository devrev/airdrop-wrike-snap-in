import axios from 'axios';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';

// Test configuration
const TEST_TIMEOUT = 120000; // 120 seconds as per requirements
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const FUNCTION_NAME = 'fetch_wrike_contacts';

// Read environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || 'IEAGS6BYI5RFMPPY'; // Default value as per requirements

// Setup callback server
let callbackServer: Server;
let callbackServerUrl: string;

beforeAll(async () => {
  // Create a simple HTTP server to act as callback server
  callbackServer = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
  });

  // Start the server on port 8002
  await new Promise<void>((resolve) => {
    callbackServer.listen(8002, () => {
      const address = callbackServer.address() as AddressInfo;
      callbackServerUrl = `http://localhost:${address.port}`;
      console.log(`Callback server running at ${callbackServerUrl}`);
      resolve();
    });
  });
});

afterAll(() => {
  // Close the callback server
  if (callbackServer) {
    callbackServer.close();
  }
});

// Helper function to create a test event
function createTestEvent(apiKey?: string, spaceId?: string) {
  return {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-service-account-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: FUNCTION_NAME,
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        key: apiKey,
        org_id: spaceId,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${callbackServerUrl}/callback`
      }
    }
  };
}

// Test cases
describe('Wrike Contacts Fetching Conformance Tests', () => {
  // Test 1: Verify that the function exists and can be invoked
  test('Function exists and can be invoked', async () => {
    const event = createTestEvent('dummy-key', 'dummy-space-id');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    
    // We don't care about success here, just that the function exists and returns a response
    expect(response.data.function_result).toBeDefined();
  }, TEST_TIMEOUT);

  // Test 2: Test with missing API key
  test('Returns error when API key is missing', async () => {
    const event = createTestEvent(undefined, WRIKE_SPACE_GID);
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('API key is missing');
  }, TEST_TIMEOUT);

  // Test 3: Test with missing Space ID
  test('Returns error when Space ID is missing', async () => {
    const event = createTestEvent(WRIKE_API_KEY, undefined);
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Space ID is missing');
  }, TEST_TIMEOUT);

  // Test 4: Test with invalid API key
  test('Returns authentication error with invalid API key', async () => {
    const event = createTestEvent('invalid-api-key', WRIKE_SPACE_GID);
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    
    // Check for authentication error message
    const errorMessage = response.data.function_result.message;
    expect(
      errorMessage.includes('Authentication failed') || 
      errorMessage.includes('Invalid API key') ||
      errorMessage.includes('invalid_request')
    ).toBe(true);
  }, TEST_TIMEOUT);

  // Test 5: Test with valid credentials if available
  test('Handles API requests appropriately with provided credentials', async () => {
    // Skip detailed validation if no API key is provided
    if (!WRIKE_API_KEY) {
      console.log('Skipping detailed API validation as no WRIKE_API_KEY is provided');
      
      // Instead, verify the function handles the request and returns a response
      const event = createTestEvent('dummy-key', WRIKE_SPACE_GID);
      const response = await axios.post(SNAP_IN_SERVER_URL, event);
      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      return;
    }
    
    const event = createTestEvent(WRIKE_API_KEY, WRIKE_SPACE_GID);
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    
    // If we got a successful response, validate the structure
    if (response.data.function_result.success === true) {
      expect(response.data.function_result.contacts).toBeDefined();
      expect(Array.isArray(response.data.function_result.contacts)).toBe(true);
      
      // If we have contacts, check their structure
      if (response.data.function_result.contacts.length > 0) {
        const firstContact = response.data.function_result.contacts[0];
        expect(firstContact).toHaveProperty('id');
        expect(firstContact).toHaveProperty('first_name');
        expect(firstContact).toHaveProperty('last_name');
        expect(firstContact).toHaveProperty('full_name');
      }
    } else {
      // If we got an error, make sure it's properly formatted
      expect(response.data.function_result.message).toBeDefined();
      console.log(`API request failed with message: ${response.data.function_result.message}`);
    }
  }, TEST_TIMEOUT);
});