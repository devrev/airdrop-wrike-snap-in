import axios from 'axios';
import http from 'http';
import { AddressInfo } from 'net';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

// Setup callback server
let callbackServer: http.Server;
let callbackServerUrl: string;

beforeAll(async () => {
  // Create a simple HTTP server for callbacks
  callbackServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  });

  // Start the server
  await new Promise<void>((resolve) => {
    callbackServer.listen(CALLBACK_SERVER_PORT, () => {
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

describe('Wrike Authentication Tests', () => {
  // Test 1: Basic invocation test
  test('should be able to invoke the check_wrike_auth function', async () => {
    const payload = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version-id'
      },
      execution_metadata: {
        function_name: 'check_wrike_auth',
        devrev_endpoint: 'http://localhost:8003'
      },
      payload: {
        connection_data: {
          key: 'dummy-key',
          key_type: 'api_key',
          org_id: 'test-org-id',
          org_name: 'Test Org'
        },
        event_context: {
          callback_url: callbackServerUrl,
          external_sync_unit_id: 'IEAGS6BYI5RFMPPY'
        }
      },
      input_data: {}
    };

    try {
      const response = await axios.post(TEST_SERVER_URL, payload);
      
      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('authenticated');
      expect(response.data.function_result).toHaveProperty('message');
      
      // We don't expect authentication to succeed with a dummy key
      expect(response.data.function_result.authenticated).toBe(false);
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : 'Unknown error';
      throw new Error(`Failed to invoke check_wrike_auth function: ${errorMessage}`);
    }
  });

  // Test 2: Missing API key test
  test('should handle missing API key gracefully', async () => {
    const payload = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version-id'
      },
      execution_metadata: {
        function_name: 'check_wrike_auth',
        devrev_endpoint: 'http://localhost:8003'
      },
      payload: {
        connection_data: {
          // key is intentionally missing
          key_type: 'api_key',
          org_id: 'test-org-id',
          org_name: 'Test Org'
        },
        event_context: {
          callback_url: callbackServerUrl,
          external_sync_unit_id: 'IEAGS6BYI5RFMPPY'
        }
      },
      input_data: {}
    };

    try {
      const response = await axios.post(TEST_SERVER_URL, payload);
      
      // Verify response structure and content
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('authenticated', false);
      expect(response.data.function_result).toHaveProperty('message');
      expect(response.data.function_result.message).toContain('missing');
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : 'Unknown error';
      throw new Error(`Failed to test missing API key scenario: ${errorMessage}`);
    }
  });

  // Test 3: Invalid API key test
  test('should handle invalid API key correctly', async () => {
    const payload = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version-id'
      },
      execution_metadata: {
        function_name: 'check_wrike_auth',
        devrev_endpoint: 'http://localhost:8003'
      },
      payload: {
        connection_data: {
          key: 'invalid-api-key-that-will-fail-authentication',
          key_type: 'api_key',
          org_id: 'test-org-id',
          org_name: 'Test Org'
        },
        event_context: {
          callback_url: callbackServerUrl,
          external_sync_unit_id: 'IEAGS6BYI5RFMPPY'
        }
      },
      input_data: {}
    };

    try {
      const response = await axios.post(TEST_SERVER_URL, payload);
      
      // Verify response structure and content
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('authenticated', false);
      expect(response.data.function_result).toHaveProperty('message');
      // The message should indicate authentication failure
      expect(response.data.function_result.message.toLowerCase()).toContain('fail');
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : 'Unknown error';
      throw new Error(`Failed to test invalid API key scenario: ${errorMessage}`);
    }
  });

  // Test 4: Valid authentication test (using environment variables)
  test('should authenticate successfully with valid API key from environment', async () => {
    // Skip test if environment variables are not set
    const apiKey = process.env.WRIKE_API_KEY;
    if (!apiKey) {
      console.warn('Skipping valid authentication test: WRIKE_API_KEY environment variable not set');
      return;
    }

    const payload = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version-id'
      },
      execution_metadata: {
        function_name: 'check_wrike_auth',
        devrev_endpoint: 'http://localhost:8003'
      },
      payload: {
        connection_data: {
          key: apiKey,
          key_type: 'api_key',
          org_id: 'test-org-id',
          org_name: 'Test Org'
        },
        event_context: {
          callback_url: callbackServerUrl,
          external_sync_unit_id: process.env.WRIKE_SPACE_GID || 'IEAGS6BYI5RFMPPY'
        }
      },
      input_data: {}
    };

    try {
      const response = await axios.post(TEST_SERVER_URL, payload);
      
      // Verify response structure and content
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('authenticated');
      expect(response.data.function_result).toHaveProperty('message');
      
      // With a valid API key, authentication should succeed
      expect(response.data.function_result.authenticated).toBe(true);
      expect(response.data.function_result.message).toContain('Successfully');
      
      // Should have details about the authentication
      expect(response.data.function_result).toHaveProperty('details');
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : 'Unknown error';
      throw new Error(`Failed to test valid authentication scenario: ${errorMessage}`);
    }
  });
});