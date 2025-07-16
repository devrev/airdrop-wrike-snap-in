import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Setup callback server
let callbackServer: Server;
let callbackData: any = null;

// Setup callback server
const setupCallbackServer = (): Promise<void> => {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());
    
    app.post('*', (req, res) => {
      callbackData = req.body;
      res.status(200).send({ status: 'success' });
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      resolve();
    });
  });
};

// Cleanup callback server
const cleanupCallbackServer = (): Promise<void> => {
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
};

// Helper function to create a test event
const createTestEvent = (apiKey: string, spaceId: string) => {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_version_id: 'test-version-id',
      snap_in_id: 'test-snap-in-id'
    },
    payload: {
      connection_data: {
        key: apiKey,
        org_id: spaceId,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-org',
        dev_org_id: 'test-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: 'IEAGS6BYI5RFMPPY',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'wrike',
        external_system_type: 'wrike',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'test-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-tier',
        sync_unit: 'test-unit',
        sync_unit_id: 'test-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: 'TEST_EVENT'
    },
    execution_metadata: {
      devrev_endpoint: 'http://localhost:8003',
      function_name: 'fetch_projects'
    },
    input_data: {}
  };
};

describe('Fetch Projects Function Tests', () => {
  beforeAll(async () => {
    await setupCallbackServer();
  });

  afterAll(async () => {
    await cleanupCallbackServer();
  });

  beforeEach(() => {
    callbackData = null;
  });

  // Test 1: Verify environment variables
  test('Environment variables are set correctly', () => {
    const apiKey = process.env.WRIKE_API_KEY;
    const spaceId = process.env.WRIKE_SPACE_GID;
    
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(spaceId).toBeDefined();
    expect(spaceId).not.toBe('');
    
    console.log('Environment variables are set correctly');
  });

  // Test 2: Verify test server connectivity
  test('Test server is accessible', async () => {
    try {
      const response = await axios.post(TEST_SERVER_URL, {}, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // We expect an error response since we're not sending a valid event,
      // but the server should be accessible
      expect(response.status).toBe(200);
      console.log('Test server is accessible');
    } catch (error: any) {
      if (error.response) {
        // Even if we get an error response, the server is accessible
        expect(error.response.status).toBeLessThan(500);
        console.log('Test server is accessible (returned error as expected for invalid request)');
      } else {
        throw new Error(`Test server is not accessible: ${error.message}`);
      }
    }
  });

  // Test 3: Test function invocation
  test('Function can be invoked', async () => {
    const apiKey = process.env.WRIKE_API_KEY || '';
    const spaceId = process.env.WRIKE_SPACE_GID || '';
    
    const testEvent = createTestEvent(apiKey, spaceId);
    
    try {
      const response = await axios.post(TEST_SERVER_URL, testEvent, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      
      console.log('Function invocation successful');
    } catch (error: any) {
      console.error('Function invocation failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 4: Test API authentication
  test('Function can authenticate with Wrike API', async () => {
    const apiKey = process.env.WRIKE_API_KEY || '';
    const spaceId = process.env.WRIKE_SPACE_GID || '';
    
    const testEvent = createTestEvent(apiKey, spaceId);
    
    try {
      const response = await axios.post(TEST_SERVER_URL, testEvent, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status).toBe('success');
      expect(response.data.error).toBeUndefined();
      
      console.log('API authentication successful');
    } catch (error: any) {
      console.error('API authentication failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 5: Test projects fetching
  test('Function can fetch projects from Wrike API', async () => {
    const apiKey = process.env.WRIKE_API_KEY || '';
    const spaceId = process.env.WRIKE_SPACE_GID || '';
    
    const testEvent = createTestEvent(apiKey, spaceId);
    
    try {
      const response = await axios.post(TEST_SERVER_URL, testEvent, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status).toBe('success');
      expect(response.data.function_result.projects).toBeDefined();
      expect(Array.isArray(response.data.function_result.projects)).toBe(true);
      
      // Verify project structure
      if (response.data.function_result.projects.length > 0) {
        const project = response.data.function_result.projects[0];
        expect(project.id).toBeDefined();
        expect(project.title).toBeDefined();
        expect(project.created_date).toBeDefined();
        expect(project.updated_date).toBeDefined();
        expect(project.scope).toBeDefined();
      }
      
      console.log(`Successfully fetched ${response.data.function_result.projects.length} projects`);
    } catch (error: any) {
      console.error('Projects fetching failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 6: Test error handling with invalid credentials
  test('Function handles invalid API key correctly', async () => {
    const invalidApiKey = 'invalid-api-key';
    const spaceId = process.env.WRIKE_SPACE_GID || '';
    
    const testEvent = createTestEvent(invalidApiKey, spaceId);
    
    try {
      const response = await axios.post(TEST_SERVER_URL, testEvent, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status).toBe('error');
      expect(response.data.function_result.error).toBeDefined();
      
      console.log('Error handling for invalid API key works correctly');
    } catch (error: any) {
      console.error('Error handling test failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test 7: Acceptance Test - Verify "First project" exists in the results
  test('Function returns a project with title "First project"', async () => {
    const apiKey = process.env.WRIKE_API_KEY || '';
    const spaceId = process.env.WRIKE_SPACE_GID || '';
    
    const testEvent = createTestEvent(apiKey, spaceId);
    
    try {
      const response = await axios.post(TEST_SERVER_URL, testEvent, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Verify basic response structure
      // Check HTTP status code
      expect(response.status).toBe(200);
      
      // Check response data structure
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status).toBe('success');
      expect(response.data.function_result.projects).toBeDefined();
      expect(Array.isArray(response.data.function_result.projects)).toBe(true);
      
      // Get the projects array
      const projects = response.data.function_result.projects;
      
      // Log the number of projects for debugging
      console.log(`Found ${projects.length} projects in the response`);

      // Check if there are any projects
      console.log('Checking if at least one project is returned');
      expect(projects.length).toBeGreaterThan(0);
      
      // For debugging, log all project titles
      const projectTitles = projects.map((p: any) => p.title);
      console.log('Project titles found:', projectTitles);
      
      // Find the "First project"
      console.log('Looking for "First project" in the results');
      const firstProject = projects.find((project: any) => project.title === 'First project');
      
      // Assert that "First project" exists
      if (!firstProject) {
        console.error(`Project with title "First project" not found. Available projects: ${projectTitles.join(', ')}`);
      }
      expect(firstProject).toBeDefined();
      
      // Additional checks on the "First project" structure
      if (firstProject) {
        console.log('Checking "First project" structure');
        expect(firstProject.id).toBeDefined();
        expect(firstProject.created_date).toBeDefined();
        expect(firstProject.updated_date).toBeDefined();
        expect(firstProject.scope).toBeDefined();
        
        console.log('Successfully found "First project" with ID:', firstProject.id);
      }
    } catch (error: any) {
      // Detailed error logging for debugging
      if (error.response) {
        console.error('API Response Error:', {
          status: error.response.status,
          data: error.response.data
        });
      } else {
        console.error('Error during test execution:', error.message);
      }
      throw error;
    }
  });
});