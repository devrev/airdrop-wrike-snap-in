import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

// Environment variables check
const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID;

// Test data
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY'; // Can be used when space ID is required

// Setup callback server
let callbackServer: Server;
let callbackServerUrl: string;

beforeAll(async () => {
  // Check required environment variables
  if (!WRIKE_API_KEY) {
    throw new Error('WRIKE_API_KEY environment variable is required');
  }
  if (!WRIKE_SPACE_GID) {
    throw new Error('WRIKE_SPACE_GID environment variable is required');
  }

  // Setup callback server
  const app = express();
  app.use(express.json());
  
  // Store received data for verification
  let receivedData: any = null;
  app.use(express.urlencoded({ extended: true }));
  
  app.post('/callback', (req, res) => {
    receivedData = req.body;
    res.status(200).send({ status: 'ok' });
  });
  
  // Start the server
  callbackServer = app.listen(CALLBACK_SERVER_PORT);
  const address = callbackServer.address() as AddressInfo;
  callbackServerUrl = `http://localhost:${address.port}/callback`;
  
  console.log(`Callback server started at ${callbackServerUrl}`);
});

afterAll(async () => {
  // Cleanup: close the callback server
  if (callbackServer && callbackServer.listening) {
    await new Promise<void>((resolve) => {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    });
  }
  
  // Force close any remaining connections
  await new Promise(resolve => setTimeout(resolve, 100));
});

describe('External Domain Metadata Generation Tests', () => {
  // Test 1: Basic - Verify function exists and can be called
  test('Function generate_external_domain_metadata exists and can be called', async () => {
    const event = createTestEvent('generate_external_domain_metadata');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
  });

  // Test 2: Simple - Verify function returns proper response structure
  test('Function returns a properly structured response with success status', async () => {
    const event = createTestEvent('generate_external_domain_metadata');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toBeDefined();
    expect(response.data.function_result.metadata).toBeDefined();
  });

  // Test 3: More Complex - Verify metadata contains required record types
  test('Metadata contains required record types: tasks and users', async () => {
    const event = createTestEvent('generate_external_domain_metadata');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    const metadata = response.data.function_result.metadata;
    expect(metadata).toBeDefined();
    expect(metadata.record_types).toBeDefined();
    expect(metadata.record_types.tasks).toBeDefined();
    expect(metadata.record_types.users).toBeDefined();
  });

  // Test 4: Most Complex - Verify metadata structure conforms to schema requirements
  test('Metadata structure conforms to schema requirements', async () => {
    const event = createTestEvent('generate_external_domain_metadata');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    const metadata = response.data.function_result.metadata;
    
    // Check schema version
    expect(metadata.schema_version).toBe('v0.2.0');
    
    // Check tasks record type structure
    const tasksRecordType = metadata.record_types.tasks;
    expect(tasksRecordType.fields).toBeDefined();
    expect(tasksRecordType.fields.id).toBeDefined();
    expect(tasksRecordType.fields.id.type).toBe('text');
    expect(tasksRecordType.fields.id.is_identifier).toBe(true);
    
    // Check users record type structure
    const usersRecordType = metadata.record_types.users;
    expect(usersRecordType.fields).toBeDefined();
    expect(usersRecordType.fields.id).toBeDefined();
    expect(usersRecordType.fields.id.type).toBe('text');
    expect(usersRecordType.fields.id.is_identifier).toBe(true);
    
    // Check reference fields format
    if (tasksRecordType.fields.responsible_ids) {
      const responsibleIdsField = tasksRecordType.fields.responsible_ids;
      expect(responsibleIdsField.type).toBe('reference');
      expect(responsibleIdsField.reference).toBeDefined();
      expect(responsibleIdsField.reference.refers_to).toBeDefined();
      
      // Check that reference uses the correct format "#record:<record_type_key>"
      const refersToKeys = Object.keys(responsibleIdsField.reference.refers_to);
      expect(refersToKeys.length).toBeGreaterThan(0);
      expect(refersToKeys[0].startsWith('#record:')).toBe(true);
    }
  });
});

// Helper function to create a test event
function createTestEvent(functionName: string) {
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
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Organization',
        key: WRIKE_API_KEY,
        key_type: 'api_key'
      },
      event_context: {
        callback_url: callbackServerUrl,
        external_sync_unit_id: TEST_PROJECT_ID
      }
    }
  };
}