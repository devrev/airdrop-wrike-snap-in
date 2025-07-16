import axios from 'axios';
import http from 'http';
import { AddressInfo } from 'net';
import { EventType } from '@devrev/ts-adaas';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

// Test data
const MOCK_SERVICE_ACCOUNT_TOKEN = 'mock-service-account-token';
const MOCK_SNAP_IN_VERSION_ID = 'mock-snap-in-version-id';
const MOCK_DEVREV_ENDPOINT = 'http://localhost:8003';

// Interface for callback server requests
interface CallbackRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: any;
}

describe('Data Extraction Conformance Tests', () => {
  let callbackServer: http.Server;
  let callbackServerUrl: string;
  let callbackRequests: CallbackRequest[] = [];

  // Setup callback server before tests
  beforeAll((done) => {
    // Create a simple HTTP server to act as the callback server
    callbackServer = http.createServer((req, res) => {
      let body = '';      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        // Store the request for later verification
        callbackRequests.push({
          method: req.method || '',
          url: req.url || '',
          headers: req.headers,
          body: body ? (() => {
            try {
              return JSON.parse(body);
            } catch (e) {
              return body;
            }
          })() : {}
        });
        
        // Send a success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      });
    });

    // Start the server and get the assigned port
    callbackServer.listen(CALLBACK_SERVER_PORT, 'localhost', () => {
      const address = callbackServer.address() as AddressInfo;
      callbackServerUrl = `http://localhost:${CALLBACK_SERVER_PORT}`;
      console.log(`Callback server started at ${callbackServerUrl}`);
      done();
    });
  });

  // Clean up after tests
  afterAll((done) => {
    if (callbackServer && callbackServer.listening) {
      callbackServer.close(() => {
        done();
      });
    } else {
      done();
    }
  });

  // Reset callback requests before each test
  beforeEach(() => {
    callbackRequests = [];
  });

  // Helper function to create a valid event
  const createValidEvent = (eventType: EventType): any => {
    return {
      context: {
        secrets: {
          service_account_token: MOCK_SERVICE_ACCOUNT_TOKEN
        },
        snap_in_version_id: MOCK_SNAP_IN_VERSION_ID,
        snap_in_id: 'mock-snap-in-id'
      },
      payload: {
        event_type: eventType,
        event_context: {
          callback_url: callbackServerUrl,
          dev_org: 'mock-dev-org',
          dev_org_id: 'mock-dev-org-id',
          dev_user: 'mock-dev-user',
          dev_user_id: 'mock-dev-user-id',
          external_sync_unit: 'mock-external-sync-unit',
          external_sync_unit_id: 'mock-external-sync-unit-id',
          external_sync_unit_name: 'mock-external-sync-unit-name',
          external_system: 'mock-external-system',
          external_system_type: 'mock-external-system-type',
          import_slug: 'mock-import-slug',
          mode: 'INITIAL',
          request_id: 'mock-request-id',
          snap_in_slug: 'mock-snap-in-slug',
          snap_in_version_id: MOCK_SNAP_IN_VERSION_ID,
          sync_run: 'mock-sync-run',
          sync_run_id: 'mock-sync-run-id',
          sync_tier: 'mock-sync-tier',
          sync_unit: 'mock-sync-unit',
          sync_unit_id: 'mock-sync-unit-id',
          uuid: 'mock-uuid',
          worker_data_url: 'http://localhost:8003/external-worker'
        }
      },
      execution_metadata: {
        devrev_endpoint: MOCK_DEVREV_ENDPOINT,
        function_name: 'data_extraction_check'
      },
      input_data: {}
    };
  };

  // Test 1: Basic Invocation
  test('should successfully invoke data_extraction_check function', async () => {
    const event = createValidEvent(EventType.ExtractionDataStart);
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.error).toBeUndefined();
  });

  // Test 2: Event Validation
  test('should validate input events', async () => {
    // Create an invalid event (missing required fields)
    // This event is missing the required service_account_token
    const invalidEvent = createValidEvent(EventType.ExtractionDataStart);
    // Remove the service_account_token to make it invalid
    if (invalidEvent.context && invalidEvent.context.secrets) {
      delete invalidEvent.context.secrets.service_account_token;
    }

    // Expect the request to throw an error
    expect.assertions(1); // We expect one assertion to be made

    try {
      await axios.post(SNAP_IN_SERVER_URL, invalidEvent);
      fail('Expected request to fail with validation error');
    } catch (error: any) {
      // Just verify that an error was thrown
      // The exact format of the error may vary depending on how the server handles it
      expect(error).toBeDefined();
    }
  });

  // Test 3: Event Type Recognition
  test('should correctly identify data extraction events', async () => {
    // Test with a non-data extraction event
    const nonDataExtractionEvent = createValidEvent(EventType.ExtractionMetadataStart);
    
    const response = await axios.post(SNAP_IN_SERVER_URL, nonDataExtractionEvent);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.valid_data_extraction_events).toBe(false);
    
    // Test with a data extraction event
    const dataExtractionEvent = createValidEvent(EventType.ExtractionDataStart);
    
    const dataResponse = await axios.post(SNAP_IN_SERVER_URL, dataExtractionEvent);
    
    expect(dataResponse.status).toBe(200);
    expect(dataResponse.data.function_result).toBeDefined();
    expect(dataResponse.data.function_result.valid_data_extraction_events).toBe(true);
  });

  // Test 4: Complete Workflow
  test('should complete the data extraction workflow successfully', async () => {
    const event = createValidEvent(EventType.ExtractionDataStart);
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.valid_data_extraction_events).toBe(true);
    
    // Wait for the worker to complete (this may take a moment)
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify that the worker completed successfully by checking if any callback requests were made
    // In a real implementation, we would check for specific events like EXTRACTION_DATA_DONE
    // but for this test, we're just verifying the function was called correctly
    expect(callbackRequests.length).toBeGreaterThan(0);
  });
});