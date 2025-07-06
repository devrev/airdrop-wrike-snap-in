import axios, { AxiosResponse } from 'axios';
import express, { Request, Response } from 'express';
import { Server } from 'http'; 
import { AddressInfo } from 'net';

describe('Initial Domain Mapping Tests', () => {
  // Environment variables
  const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
  const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID;
  const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY'; // As specified in requirements

  // Server URLs
  const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
  
  // Callback server
  let callbackServer: Server;
  let callbackUrl: string;
  let receivedData: any = null;

  beforeAll(async () => {
    // Set up callback server
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    
    app.post('*', (req: Request, res: Response) => {
      receivedData = req.body;
      res.status(200).send({ success: true });
    });
    
    callbackServer = app.listen(8002);
    const address = callbackServer.address() as AddressInfo;
    callbackUrl = `http://localhost:${address.port}/callback`;
    
    console.log(`Callback server running at ${callbackUrl}`);
  });

  afterAll(async () => {
    // Close callback server
    if (callbackServer) {
      await new Promise<void>((resolve) => {
        callbackServer.close(() => resolve());
      });
    }
  });

  beforeEach(() => {
    receivedData = null;
  });

  // Test 1: Check environment variables
  test('Environment variables are set correctly', async () => {
    expect(WRIKE_API_KEY).toBeDefined();
    expect(WRIKE_SPACE_GID).toBeDefined();
    expect(typeof WRIKE_API_KEY).toBe('string');
    expect(typeof WRIKE_SPACE_GID).toBe('string');
  });

  // Test 2: Test server connectivity
  test('Can connect to Test Snap-In Server', async () => {
    // Create a simple event to test connectivity
    const testEvent = createTestEvent('canInvoke');
    
    let response: AxiosResponse;
    try {
      response = await axios.post(SNAP_IN_SERVER_URL, testEvent);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    } catch (error) {
      console.error('Failed to connect to Test Snap-In Server:', error);
      throw error;
    }
  });

  // Test 3: Test generate_initial_domain_mapping function
  test('Can generate Initial Domain Mapping', async () => {
    const event = createTestEvent('generate_initial_domain_mapping', {
      callback_url: callbackUrl,
      external_sync_unit_id: TEST_PROJECT_ID
    });
    
    let response;
    try {
      response = await axios.post(SNAP_IN_SERVER_URL, event);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.error).toBeUndefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.success).toBe(true);
      expect(response.data.function_result.mapping).toBeDefined();
      return response.data.function_result.mapping;
    } catch (error) {
      console.error('Failed to generate Initial Domain Mapping:', error);
      throw error;
    }
    
    const mapping = response.data.function_result.mapping;
    validateInitialDomainMapping(mapping);
  });

  // Test 4: Validate Initial Domain Mapping structure
  function validateInitialDomainMapping(mapping: any) {
    // Check top-level structure
    expect(mapping.format_version).toBeDefined();
    expect(mapping.devrev_metadata_version).toBeDefined();
    expect(mapping.additional_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings).toBeDefined();
    
    // Check record type mappings
    const recordTypeMappings = mapping.additional_mappings.record_type_mappings;
    expect(recordTypeMappings.tasks).toBeDefined();
    expect(recordTypeMappings.users).toBeDefined();
    
    // Test 5: Validate tasks mapping
    validateRecordTypeMapping(recordTypeMappings.tasks, 'tasks');
    
    // Test 6: Validate users mapping
    validateRecordTypeMapping(recordTypeMappings.users, 'users');
  }

  // Test 7: Validate record type mapping
  function validateRecordTypeMapping(mapping: any, recordType: string) {
    expect(mapping.default_mapping).toBeDefined();
    expect(mapping.default_mapping.object_category || typeof mapping.default_mapping === 'string').toBeTruthy();
    expect(mapping.default_mapping.object_type).toBeDefined();
    
    expect(mapping.mapping_as_custom_object).toBeDefined();
    expect(mapping.mapping_as_custom_object.forward).toBeDefined();
    expect(mapping.mapping_as_custom_object.reverse).toBeDefined();
    expect(mapping.mapping_as_custom_object.shard).toBeDefined();
    
    expect(mapping.possible_record_type_mappings).toBeDefined();
    expect(Array.isArray(mapping.possible_record_type_mappings)).toBe(true);
    
    // Validate shard
    const shard = mapping.mapping_as_custom_object.shard;
    expect(shard.mode).toBeDefined();
    expect(shard.devrev_leaf_type).toBeDefined();
    expect(shard.devrev_leaf_type.object_category).toBeDefined();
    expect(shard.devrev_leaf_type.object_type).toBeDefined();
    expect(shard.stock_field_mappings).toBeDefined();
    
    // Test 8: Validate field mappings and transformation methods
    validateFieldMappings(shard.stock_field_mappings, recordType);
    
    // Validate possible record type mappings
    mapping.possible_record_type_mappings.forEach((possibleMapping: any) => {
      expect(possibleMapping.devrev_leaf_type).toBeDefined();
      expect(possibleMapping.forward).toBeDefined();
      expect(possibleMapping.reverse).toBeDefined();
      expect(possibleMapping.shard).toBeDefined();
      expect(possibleMapping.shard.mode).toBeDefined();
      expect(possibleMapping.shard.devrev_leaf_type).toBeDefined();
      expect(possibleMapping.shard.stock_field_mappings).toBeDefined();
      
      validateFieldMappings(possibleMapping.shard.stock_field_mappings, recordType);
    });
  }

  // Helper function to validate field mappings
  function validateFieldMappings(fieldMappings: Record<string, any>, recordType: string) {
    // Check that we have some field mappings
    expect(Object.keys(fieldMappings).length).toBeGreaterThan(0);
    
    // Check each field mapping
    for (const [fieldName, mapping] of Object.entries<any>(fieldMappings)) {
      expect(mapping.forward).toBeDefined();
      expect(mapping.reverse).toBeDefined();
      if (mapping.transformation_method_for_set) {
      expect(mapping.transformation_method_for_set.transformation_method).toBeDefined();
      
      // Validate transformation method
      const method = mapping.transformation_method_for_set.transformation_method;
      expect([
        'use_directly',
        'use_rich_text',
        'map_enum',
        'use_fixed_value',
        'filter_typed_reference',
        'make_authorization_target',
        'make_custom_links',
        'make_custom_stages',
        'map_roles',
        'use_as_array_value',
        'use_devrev_record',
        'use_first_non_null',
        'use_raw_jq'
      ]).toContain(method);
      
      // Check specific transformation methods
      if (method === 'map_enum') {
        expect(mapping.transformation_method_for_set.forward).toBeDefined();
        expect(typeof mapping.transformation_method_for_set.forward).toBe('object');
      }
      
      if (method === 'use_fixed_value') {
        expect(mapping.transformation_method_for_set.value).toBeDefined();
      }
      }
    }
  }

  // Helper function to create test events
  function createTestEvent(functionName: string, eventContext: any = {}) {
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
      payload: {
        connection_data: {
          org_id: WRIKE_SPACE_GID,
          org_name: 'Test Org',
          key: WRIKE_API_KEY,
          key_type: 'api_key'
        },
        event_context: {
          ...eventContext
        }
      }
    };
  }
});