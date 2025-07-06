import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 30000; // 30 seconds per test

// Environment variables
// Use a fallback mock API key for tests that don't require actual API calls
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || 'mock-api-key-for-testing';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || 'IEAGS6BYI5RFMPPY'; // Default space ID for testing

// Setup callback server
let callbackServer: Server;
let callbackData: any = null;

beforeAll(async () => {
  // Start callback server
  const app = express();
  app.use(bodyParser.json());
  
  app.post('/callback', (req, res) => {
    callbackData = req.body;
    res.status(200).send({ status: 'success' });
  });
  
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
});

afterAll(async () => {
  // Close callback server
  jest.setTimeout(10000); // Ensure we have enough time to close the server
  if (callbackServer) {
    return new Promise<void>((resolve) => {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    });
  }
});

beforeEach(() => {
  // Reset callback data before each test
  callbackData = null;
});

// Helper function to create a basic event object
function createEventObject(functionName: string, customPayload: any = {}) {
  return {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
        actor_session_token: 'test-actor-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {}, 
      event_sources: {}
    },
    payload: customPayload || {
      connection_data: {
        key: WRIKE_API_KEY,
        key_type: 'api_key',
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Space'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-org',
        dev_org_id: 'test-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: WRIKE_SPACE_GID,
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'wrike',
        external_system_type: 'wrike',
        import_slug: 'test-import-slug',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in-slug',
        snap_in_version_id: 'test-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-tier',
        sync_unit: 'test-unit',
        sync_unit_id: 'test-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    }
  };
}

// Helper function to invoke a function on the test server
async function invokeFunction(functionName: string, payload: any = {}) {
  try {
    // Create a default payload with connection data if none is provided
    let defaultPayload = {
      connection_data: {
        key: WRIKE_API_KEY,
        key_type: 'api_key',
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Space'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        // Other event context fields are included in createEventObject
      }
    };
    
    // Use the provided payload or the default one
    const event = createEventObject(functionName, Object.keys(payload).length > 0 ? payload : defaultPayload);
    
    const response = await axios.post(TEST_SERVER_URL, event);
    console.log(`Response from ${functionName}:`, JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`Error invoking function ${functionName}:`, error);
    throw error;
  }
}

describe('Wrike Projects Fetching Functionality', () => {
  // Check if we have the required API key for tests that need real API access
  const hasRealApiKey = process.env.WRIKE_API_KEY !== undefined;
  
  beforeAll(() => {
    if (!hasRealApiKey) {
      console.warn('⚠️ WRIKE_API_KEY environment variable is not set. Some tests will be conditionally skipped or use mock data.');
    }
  });

  // Test 1: Basic invocation test
  test('can invoke the function', async () => {
    const result = await invokeFunction('canInvoke');
    
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.can_invoke).toBe(true);
    expect(result.function_result.message).toBeDefined();
  }, TEST_TIMEOUT);

  // Test 2: Authentication test
  (hasRealApiKey ? test : test.skip)('can authenticate with Wrike API', async () => {
    // Create a payload with the API key
    const payload = {
      connection_data: {
        key: process.env.WRIKE_API_KEY,
        key_type: 'api_key',
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Space'
      }
    };
    
    const result = await invokeFunction('check_wrike_auth', payload);
    
    // Log the result for debugging
    console.log('Authentication result:', JSON.stringify(result.function_result, null, 2));
    
    // Check the result
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    
    // If we have a real API key, expect authentication to succeed
    expect(result.function_result.authenticated).toBe(true);
    expect(result.function_result.details).toBeDefined();
  }, TEST_TIMEOUT);

  // Test 3: Main functionality test - fetching projects
  (hasRealApiKey ? test : test.skip)('can fetch projects from Wrike with real API key', async () => {
    const result = await invokeFunction('fetch_wrike_projects');
    
    // Log the result for debugging
    console.log('Fetch projects result:', JSON.stringify(result.function_result, null, 2));
    
    // Basic structure checks
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('Successfully fetched');
    
    // Check projects array
    expect(result.function_result.projects).toBeDefined();
    expect(Array.isArray(result.function_result.projects)).toBe(true);
    
    // If projects were returned, check their structure
    if (result.function_result.projects.length > 0) {
      const project = result.function_result.projects[0];
      
      // Verify project has required properties
      expect(project.id).toBeDefined();
      expect(project.title).toBeDefined();
      expect(project.created_date).toBeDefined();
      expect(project.updated_date).toBeDefined();
      
      // Log a sample project for debugging
      console.log('Sample project:', JSON.stringify(project, null, 2));
    } else {
      console.warn('No projects were returned from Wrike API. This might be expected if the space is empty.');
    }
  }, TEST_TIMEOUT);

  // Test 4: Acceptance Test - verify "First project" exists in the results
  (hasRealApiKey ? test : test.skip)('should return a project with title "First project"', async () => {
    const result = await invokeFunction('fetch_wrike_projects');
    
    // Log the result for debugging
    console.log('Fetch projects result for "First project" test:', JSON.stringify(result.function_result, null, 2));
    
    // Basic structure checks
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    
    // Fix: Use proper error message approach
    if (!result.function_result.success) {
      fail(`Expected function to succeed but got: ${JSON.stringify(result.function_result)}`);
    }
    expect(result.function_result.message).toContain('Successfully fetched');
    
    // Check projects array
    expect(result.function_result.projects).toBeDefined();
    expect(Array.isArray(result.function_result.projects)).toBe(true);
    
    // Check if projects were returned
    if (result.function_result.projects.length === 0) {
      console.error('No projects were returned from Wrike API. Cannot check for "First project".');
      fail('No projects were returned from Wrike API. Cannot check for "First project".');
      return;
    }
    
    // Log all project titles for debugging
    const projectTitles = result.function_result.projects.map((p: any) => p.title);
    console.log('All project titles:', projectTitles);
    
    // Check if "First project" exists in the results
    const firstProject = result.function_result.projects.find((p: any) => p.title === 'First project');
    
    expect(firstProject).toBeDefined();
    if (!firstProject) {
      // Additional detailed error message if the assertion fails
      console.error(`Project with title "First project" not found. Available projects: ${projectTitles.join(', ')}`);
      fail(`Project with title "First project" not found. Available projects: ${projectTitles.join(', ')}`);
    } else {
      // Log the found project for debugging
      console.log('Found "First project":', JSON.stringify(firstProject, null, 2));
    }
  }, TEST_TIMEOUT);

  // Test for mock API key scenario
  test('handles mock API key gracefully', async () => {
    // Skip this test if we have a real API key
    if (hasRealApiKey) {
      return;
    }
    
    // Create a payload with a mock API key
    const mockPayload = {
      connection_data: {
        key: 'mock-api-key-for-testing',
        key_type: 'api_key',
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Space'
      }
    };
    
    const result = await invokeFunction('fetch_wrike_projects', mockPayload);
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
  }, TEST_TIMEOUT);

  // Test 5: Error handling test - invalid space ID
  test('handles invalid space ID correctly', async () => {
    const invalidSpaceId = 'INVALID_SPACE_ID';
    
    // Create a complete payload with an invalid space ID
    const fullPayload = {
      connection_data: {
        key: WRIKE_API_KEY,
        org_id: invalidSpaceId
      }
    };
    
    const result = await invokeFunction('fetch_wrike_projects', fullPayload);
    
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
    
    // Check that the message indicates an error, but don't rely on the exact format
    // as it might change based on how the API responds to invalid space IDs
    expect(result.function_result.message).toBeTruthy();
    expect(typeof result.function_result.message).toBe('string');
  }, TEST_TIMEOUT);
});

// Add a global error handler to help with debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add a timeout to force exit after tests complete
// This helps with the "open handle" issue
afterAll(() => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log('Forcing exit after tests complete');
      resolve();
    }, 1000);
  });
});