import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http'; 

describe('Wrike API Authentication Tests', () => {
  const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
  const CALLBACK_SERVER_PORT = 8002;
  
  let callbackServer: Server;
  let callbackResponse: any = null;
  
  // Set up a callback server to receive responses - using proper async pattern
  beforeAll(async () => {
    const app = express();
    app.use(bodyParser.json());
    
    app.post('*', (req, res) => {
      callbackResponse = req.body;
      res.status(200).json({ status: 'ok' });
    });
    
    return new Promise<void>((resolve) => {
      callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
        console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
        resolve();
      });
    });
  });
  
  // Clean up after tests - using proper async pattern
  afterAll(async () => {
    return new Promise<void>((resolve) => {
      if (callbackServer) {
        callbackServer.close(() => {
          console.log('Callback server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
  
  // Reset callback response before each test
  beforeEach(() => {
    callbackResponse = null;
  });
  
  // Test 1: Simple test to verify the test server is running
  test('Test server is accessible', async () => {
    try {
      const response = await axios.post(TEST_SERVER_URL, {
        context: {
          secrets: {
            service_account_token: 'test-token'
          },
          snap_in_version_id: 'test-version'
        },
        payload: {
          connection_data: {},
          event_context: {}
        },
        execution_metadata: {
          function_name: 'healthcheck',
          devrev_endpoint: 'http://localhost:8003'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    } catch (error) {
      console.error('Error accessing test server:', error);
      throw error;
    }
  });
  
  // Test 2: Basic test with valid credentials
  test('Authentication with valid API key succeeds', async () => {
    // Get API key from environment variables
    const apiKey = process.env.WRIKE_API_KEY;
    if (!apiKey) {
      fail('WRIKE_API_KEY environment variable not set');
      return;
    }
    
    try {
      const response = await axios.post(TEST_SERVER_URL, {
        context: {
          secrets: {
            service_account_token: 'test-token'
          },
          snap_in_version_id: 'test-version'
        },
        payload: {
          connection_data: {
            key: apiKey,
            key_type: 'api_key',
            org_id: 'test-org',
            org_name: 'Test Organization'
          },
          event_context: {
            callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
            external_sync_unit_id: 'IEAGS6BYI5RFMPPY'
          }
        },
        execution_metadata: {
          function_name: 'auth_check',
          devrev_endpoint: 'http://localhost:8003'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status).toBe('success');
      expect(response.data.function_result.auth_successful).toBe(true);
    } catch (error) {
      console.error('Error testing authentication with valid API key:', error);
      throw error;
    }
  });
  
  // Test 3: Error test with invalid credentials
  test('Authentication with invalid API key fails', async () => {
    try {
      const response = await axios.post(TEST_SERVER_URL, {
        context: {
          secrets: {
            service_account_token: 'test-token'
          },
          snap_in_version_id: 'test-version'
        },
        payload: {
          connection_data: {
            key: 'invalid-api-key',
            key_type: 'api_key',
            org_id: 'test-org',
            org_name: 'Test Organization'
          },
          event_context: {
            callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
            external_sync_unit_id: 'IEAGS6BYI5RFMPPY'
          }
        },
        execution_metadata: {
          function_name: 'auth_check',
          devrev_endpoint: 'http://localhost:8003'
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status).toBe('error');
      expect(response.data.function_result.auth_successful).toBe(false);
      expect(response.data.function_result.error).toBeDefined();
    } catch (error) {
      console.error('Error testing authentication with invalid API key:', error);
      throw error;
    }
  });
  
  // Test 4: Edge case with malformed request
  test('Authentication with malformed request fails gracefully', async () => {
    try {
      const response = await axios.post(TEST_SERVER_URL, { 
        context: {
          secrets: {
            service_account_token: 'test-token'
          },
          snap_in_version_id: 'test-version'
        },
        payload: {
          // Missing connection_data which is required
          event_context: {
            callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
            external_sync_unit_id: 'IEAGS6BYI5RFMPPY'
          }
        },
        execution_metadata: {
          function_name: 'auth_check',
          devrev_endpoint: 'http://localhost:8003'
        }
      });
      
      // The function should handle the error and return a proper response
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined(); 
      expect(response.data.error || (response.data.function_result && response.data.function_result.error)).toBeDefined();
    } catch (error) {
      console.error('Error testing authentication with malformed request:', error);
      throw error;
    }
  });
});