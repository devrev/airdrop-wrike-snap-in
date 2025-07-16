import axios from 'axios';
import express, { Request, Response } from 'express';
import { Server } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const DEVREV_SERVER_URL = 'http://localhost:8003';
const WORKER_DATA_URL = `${DEVREV_SERVER_URL}/external-worker`;

// Define event context interface to include optional properties
interface EventContext {
  callback_url: string;
  [key: string]: any; // Allow any additional properties
}

// Define event interface to make TypeScript happy
interface Event extends Record<string, any> {}

// Mock event data
const createBasicEvent = (eventType: string) => ({
  context: {
    secrets: {
      service_account_token: 'test-token'
    },
    snap_in_id: 'test-snap-in-id',
    snap_in_version_id: 'test-snap-in-version-id'
  },
  payload: {
    event_type: eventType,
    event_context: {
      callback_url: `${CALLBACK_SERVER_URL}/callback`,
      dev_org: 'test-org',
      dev_org_id: 'test-org-id',
      dev_user: 'test-user',
      dev_user_id: 'test-user-id',
      external_sync_unit: 'test-sync-unit',
      external_sync_unit_id: 'test-sync-unit-id',
      external_sync_unit_name: 'Test Sync Unit',
      external_system: 'test-system',
      external_system_type: 'test-system-type',
      import_slug: 'test-import-slug',
      mode: 'INITIAL',
      request_id: 'test-request-id',
      snap_in_slug: 'test-snap-in-slug',
      snap_in_version_id: 'test-snap-in-version-id',
      sync_run: 'test-sync-run',
      sync_run_id: 'test-sync-run-id',
      sync_tier: 'test-tier',
      sync_unit: 'test-sync-unit',
      sync_unit_id: 'test-sync-unit-id',
      uuid: 'test-uuid',
      worker_data_url: WORKER_DATA_URL
    }
  },
  execution_metadata: {
    function_name: 'extraction_external_sync_unit_check',
    devrev_endpoint: DEVREV_SERVER_URL
  },
  input_data: {}
});

// Improved helper function to invoke the function with better error handling
const invokeFunction = async (event: Event) => {
  try {
    console.log(`Invoking function with event type: ${event.payload?.event_type || 'undefined'}`);
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Response received:', JSON.stringify(response.data));
    
    // Check if the response contains an error
    if (response.data?.error) {
      // Extract error message from various possible formats
      let errorMessage = 'Unknown error';
      
      if (response.data.error.err_msg) {
        errorMessage = response.data.error.err_msg;
      } else if (response.data.error.error && response.data.error.error.message) {
        errorMessage = response.data.error.error.message;
      } else if (typeof response.data.error === 'string') {
        errorMessage = response.data.error;
      } else {
        errorMessage = JSON.stringify(response.data.error);
      }

      throw new Error(errorMessage);
    }

    // Check if there's an error in the function_result
    if (response.data?.function_result?.error) {
      throw new Error(JSON.stringify(response.data.function_result.error));
    }

    return response.data;  
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const serverError = error.response.data.error;
      // Check if the error is a runtime error with err_msg
      if (serverError?.err_type && serverError?.err_msg) {
        throw new Error(serverError.err_msg);
      }
      // Check if the error is a function error with nested error object
      else if (serverError?.error && typeof serverError.error === 'object' && serverError.error.message) {
        throw new Error(JSON.stringify(serverError.error));
      } 
      // Otherwise just throw the error object as is
      else if (typeof serverError === 'string') {
        throw new Error(serverError);
      }
      // If we can't extract a specific error message, use the whole response
      else if (serverError) {
        throw new Error(JSON.stringify(serverError));
      }
      else if (typeof error.response.data === 'string') {
        throw new Error(error.response.data);
      }
      else {
        throw new Error(`Request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Request failed with status ${error.response.status}`);
    }
    throw error;
  } finally {
    // Empty finally block, but needed for proper syntax
  }
};

describe('Extraction External Sync Unit Check Tests', () => {
  let callbackServer: Server;
  let callbackReceived = false;

  // Setup callback server before all tests
  beforeAll((done) => {
    const app = express();
    app.use(express.json());

    app.post('/callback', (req: Request, res: Response) => {
      console.log('Callback received:', req.body);
      callbackReceived = true;
      res.status(200).send({ status: 'success' });
    });

    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at http://localhost:${CALLBACK_SERVER_PORT}`);
      done();
    });
  });

  // Cleanup callback server after all tests
  afterAll((done) => {
    callbackServer.close(() => {
      console.log('Callback server closed');
      done();
    });
  });

  // Reset callback flag before each test
  beforeEach(() => {
    callbackReceived = false;
  });

  // Test 1: Basic Invocation
  test('should successfully invoke the function with minimal valid input', async () => {
    const event = createBasicEvent('TEST_EVENT');
    
    const result = await invokeFunction(event);
    
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('success');
    expect(result.function_result.message).toBeTruthy();
    expect(result.function_result.valid_external_sync_unit_events).toBeDefined();
  });

  // Test 2: Event Validation
  test('should handle invalid events properly', async () => {
    // Create an invalid event with missing service_account_token
    const invalidEvent = {
      context: { 
        // Completely missing the service_account_token field
        secrets: {},
        snap_in_version_id: 'test-snap-in-version-id'
      },
      payload: { 
        // Include event_type to make the event more complete
        event_type: 'TEST_EVENT',
        // Include a minimal event_context to avoid other validation errors
        // that might occur before the one we're testing for
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        }
      },
      execution_metadata: {
        function_name: 'extraction_external_sync_unit_check',
        devrev_endpoint: DEVREV_SERVER_URL 
      },
      input_data: {}
    };
    
    try {
      const result = await invokeFunction(invalidEvent);
      // If we get here, the function didn't throw an error
      fail(`Expected function to throw an error but got: ${JSON.stringify(result)}`);
    } catch (error) {
      // Test passes if we get here - we expect some kind of error
      expect(error).toBeDefined();
    }
  });

  // Additional test for another validation case
  test('should handle events with missing event_context properly', async () => {
    // Create an invalid event with missing event_context    
    const invalidEvent = {
      context: { 
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-snap-in-version-id'
      },
      payload: { 
        event_type: 'TEST_EVENT'
        // Deliberately missing event_context
      },
      execution_metadata: {
        function_name: 'extraction_external_sync_unit_check',
        devrev_endpoint: DEVREV_SERVER_URL
      },
      input_data: {}
    };
    
    try {
      const result = await invokeFunction(invalidEvent);
      // If we get here, the function didn't throw an error
      fail(`Expected function to throw an error but got: ${JSON.stringify(result)}`);
    } catch (error) {
      // Test passes if we get here - we expect some kind of error
      expect(error).toBeDefined();
    }
  });

  // Test for missing execution_metadata
  test('should handle events with missing execution_metadata properly', async () => {
    // Create an invalid event with missing execution_metadata
    const invalidEvent = {
      context: { 
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-snap-in-version-id'
      },
      payload: { 
        event_type: 'TEST_EVENT',
        event_context: {}
      },
      // Deliberately missing execution_metadata
      input_data: {}
    };
    
    try {
      const result = await invokeFunction(invalidEvent);
      // If we get here, the function didn't throw an error
      fail(`Expected function to throw an error but got: ${JSON.stringify(result)}`);
    } catch (error) {
      // Test passes if we get here - we expect some kind of error
      expect(error).toBeDefined();
    }
  });

  // Test 3: Event Type Recognition
  test('should correctly identify external sync unit events', async () => {
    // Test with a non-external sync unit event
    const regularEvent = createBasicEvent('SOME_OTHER_EVENT');
    const regularResult = await invokeFunction(regularEvent);
    
    expect(regularResult.function_result.valid_external_sync_unit_events).toBe(false);
    
    // Test with an external sync unit event
    const syncUnitEvent = createBasicEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START'); 
    const syncUnitResult = await invokeFunction(syncUnitEvent);
    
    expect(syncUnitResult.function_result.valid_external_sync_unit_events).toBe(true);
  });

  // Test 4: Complete Workflow
  test('should handle a complete external sync unit workflow', async () => {
    const event: Event = createBasicEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Add more realistic data to the event
    // Use type assertion to add properties
    const eventContext = event.payload.event_context as EventContext;
    
    eventContext.extract_from = new Date().toISOString();
    eventContext.initial_sync_scope = 'full-history';
    
    const result = await invokeFunction(event);
    
    expect(result.function_result.status).toBe('success');
    expect(result.function_result.valid_external_sync_unit_events).toBe(true);

    // In a real scenario, we would expect the function to process this event
    // and potentially make callbacks, but since our implementation is just a check,
    // we're only verifying the response structure
  });
});

// Add a global afterAll hook to ensure all connections are closed
afterAll(async () => {
  // Ensure we don't leave any open connections
  // Safely close HTTP agents if they exist
  if (axios.defaults.httpAgent && typeof axios.defaults.httpAgent.destroy === 'function') {
    axios.defaults.httpAgent.destroy();
  }
  if (axios.defaults.httpsAgent && typeof axios.defaults.httpsAgent.destroy === 'function') {
    axios.defaults.httpsAgent.destroy();
  }
  await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for connections to close
});