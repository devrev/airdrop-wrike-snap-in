import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';
import bodyParser from 'body-parser';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 30000; // 30 seconds per test

// Environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || 'test-api-key';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || 'test-space-id';
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY'; // Can be used when space ID is required

// Setup callback server
let callbackServer: Server;
let callbackData: any = null;

beforeAll(async () => {
  // Create a simple express server to handle callbacks
  const app = express();
  app.use(bodyParser.json());

  // Handle all POST requests to any path
  app.post('*', (req, res) => {
    callbackData = req.body;
    res.status(200).json({ status: 'success' });
  });
  
  // Start the callback server
  return new Promise<void>((resolve, reject) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, '127.0.0.1');
    
    callbackServer.on('listening', () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      console.log(`Callback server listening on port ${(callbackServer.address() as AddressInfo).port}`);
      resolve();
    });
    
    callbackServer.on('error', (err) => {
      console.error('Error starting callback server:', err);
      reject(err);
    });
  });
});

afterAll(async () => {
  // Close the callback server
  if (callbackServer && callbackServer.listening) {
    return new Promise<void>((resolve, reject) => {
      let closeError: Error | null = null;
      const closeTimeout = setTimeout(() => {
        // Force close any remaining connections
        if (closeError) console.error('Error closing callback server (this is expected if tests failed):', closeError);
        console.log('Callback server closed');
        callbackData = null;
        resolve();
      });
      // Force timeout after 5 seconds to prevent hanging
      const forceCloseTimeout = setTimeout(() => {
        clearTimeout(closeTimeout);
        console.log('Force closing callback server after timeout');
        resolve();
      }, 5000);
      
      callbackServer.close((err) => {
        closeError = err || null;
        clearTimeout(forceCloseTimeout);
        if (err) console.error('Error closing callback server:', err);
        console.log('Callback server closed normally');
        callbackData = null;
        resolve();
      });
    });
  } else {
    return Promise.resolve();
  }
});

// Helper function to create a test event
function createTestEvent() {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id'
    },
    execution_metadata: {
      function_name: 'generate_initial_mapping',
      devrev_endpoint: 'http://localhost:8003'
    },
    payload: {
      connection_data: {
        key: WRIKE_API_KEY,
        org_id: WRIKE_SPACE_GID,
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        external_sync_unit_id: TEST_PROJECT_ID
      }
    }
  };
}

describe('Initial Domain Mapping Tests', () => {
  // Test 1: Basic Structure Test
  test('Initial domain mapping has the expected structure', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent(), { 
      timeout: 5000
    });

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.mapping).toBeDefined();
    expect(response.data.function_result.mapping.additional_mappings).toBeDefined();
    expect(response.data.function_result.mapping.additional_mappings.record_type_mappings).toBeDefined();
  }, TEST_TIMEOUT);

  // Test 2: Record Type Mappings Test
  test('Initial domain mapping contains required record types', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent(), {
      timeout: 5000
    });
    
    const mapping = response.data.function_result.mapping;
    const recordTypeMappings = mapping.additional_mappings.record_type_mappings;
    
    // Check for tasks record type
    expect(recordTypeMappings.tasks).toBeDefined();
    expect(recordTypeMappings.tasks.default_mapping).toBeDefined();
    expect(recordTypeMappings.tasks.default_mapping.object_type).toBe('ticket');
    expect(recordTypeMappings.tasks.default_mapping.object_category).toBe('stock');
    
    // Check for users record type
    expect(recordTypeMappings.users).toBeDefined();
    expect(recordTypeMappings.users.default_mapping).toBeDefined();
    expect(recordTypeMappings.users.default_mapping.object_type).toBe('revu');
    expect(recordTypeMappings.users.default_mapping.object_category).toBe('stock');
  }, TEST_TIMEOUT);

  // Test 3: Field Mappings Test
  test('Record types have necessary field mappings', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent(), {
      timeout: 5000
    });
    
    const mapping = response.data.function_result.mapping;
    const recordTypeMappings = mapping.additional_mappings.record_type_mappings;
    
    // Check tasks field mappings
    const tasksMapping = recordTypeMappings.tasks.possible_record_type_mappings[0];
    expect(tasksMapping).toBeDefined();
    expect(tasksMapping.shard).toBeDefined();
    expect(tasksMapping.shard.stock_field_mappings).toBeDefined();
    
    const tasksFieldMappings = tasksMapping.shard.stock_field_mappings;
    expect(tasksFieldMappings.title).toBeDefined();
    expect(tasksFieldMappings.body).toBeDefined();
    expect(tasksFieldMappings.stage).toBeDefined();
    expect(tasksFieldMappings.severity).toBeDefined();
    
    // Check users field mappings
    const usersMapping = recordTypeMappings.users.possible_record_type_mappings[0];
    expect(usersMapping).toBeDefined();
    expect(usersMapping.shard).toBeDefined();
    expect(usersMapping.shard.stock_field_mappings).toBeDefined();
    
    const usersFieldMappings = usersMapping.shard.stock_field_mappings;
    expect(usersFieldMappings.display_name).toBeDefined();
    expect(usersFieldMappings.email).toBeDefined();
  }, TEST_TIMEOUT);

  // Test 4: Transformation Methods Test
  test('Field mappings have correct transformation methods', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent(), {
      timeout: 5000
    });
    
    const mapping = response.data.function_result.mapping;
    const recordTypeMappings = mapping.additional_mappings.record_type_mappings;
    
    // Check tasks transformation methods
    const tasksFieldMappings = recordTypeMappings.tasks.possible_record_type_mappings[0].shard.stock_field_mappings;
    
    // Title should use "use_directly"
    expect(tasksFieldMappings.title.transformation_method_for_set).toBeDefined();
    expect(tasksFieldMappings.title.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Body should use "use_rich_text"
    expect(tasksFieldMappings.body.transformation_method_for_set).toBeDefined();
    expect(tasksFieldMappings.body.transformation_method_for_set.transformation_method).toBe('use_rich_text');
    
    // Stage should use "map_enum"
    expect(tasksFieldMappings.stage.transformation_method_for_set).toBeDefined();
    expect(tasksFieldMappings.stage.transformation_method_for_set.transformation_method).toBe('map_enum');
    expect(tasksFieldMappings.stage.transformation_method_for_set.forward).toBeDefined();
    expect(tasksFieldMappings.stage.transformation_method_for_set.reverse).toBeDefined();
    
    // Check users transformation methods
    const usersFieldMappings = recordTypeMappings.users.possible_record_type_mappings[0].shard.stock_field_mappings;
    
    // Email should use "use_directly"
    expect(usersFieldMappings.email.transformation_method_for_set).toBeDefined();
    expect(usersFieldMappings.email.transformation_method_for_set.transformation_method).toBe('use_directly');
  }, TEST_TIMEOUT);

  // Test 5: End-to-End Test
  test('Complete initial domain mapping is valid and matches expected schema', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent(), {
      timeout: 5000 // Reduced timeout to avoid hanging connections
    });
    
    const mapping = response.data.function_result.mapping;
    
    // Verify overall structure
    expect(mapping.additional_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings).toBeDefined();
    
    // Verify tasks mapping
    const tasksMappings = mapping.additional_mappings.record_type_mappings.tasks;
    expect(tasksMappings.default_mapping).toBeDefined();
    expect(tasksMappings.possible_record_type_mappings).toBeInstanceOf(Array);
    expect(tasksMappings.possible_record_type_mappings.length).toBeGreaterThan(0);
    expect(tasksMappings.mapping_as_custom_object).toBeDefined();
    
    // Verify users mapping
    const usersMappings = mapping.additional_mappings.record_type_mappings.users;
    expect(usersMappings.default_mapping).toBeDefined();
    expect(usersMappings.possible_record_type_mappings).toBeInstanceOf(Array);
    expect(usersMappings.possible_record_type_mappings.length).toBeGreaterThan(0);
    expect(usersMappings.mapping_as_custom_object).toBeDefined();
    
    // Verify specific enum mappings for tasks
    const tasksEnumMapping = tasksMappings.possible_record_type_mappings[0].shard.stock_field_mappings.stage.transformation_method_for_set;
    expect(tasksEnumMapping.forward.Active.value).toBe('work_in_progress');
    expect(tasksEnumMapping.forward.Completed.value).toBe('resolved');
    expect(tasksEnumMapping.reverse.resolved.value).toBe('Completed');
    
    // Verify specific enum mappings for severity
    const severityEnumMapping = tasksMappings.possible_record_type_mappings[0].shard.stock_field_mappings.severity.transformation_method_for_set;
    expect(severityEnumMapping.forward.High.value).toBe('high');
    expect(severityEnumMapping.forward.Normal.value).toBe('medium');
    expect(severityEnumMapping.forward.Low.value).toBe('low');
  }, TEST_TIMEOUT);
});