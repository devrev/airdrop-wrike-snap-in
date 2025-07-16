import axios from 'axios';
import express from 'express';
import { Server } from 'http'; 
import * as bodyParser from 'body-parser';

// Define interfaces for the function result structure
interface FunctionResult {
  status: string;
  message: string;
  metadata: ExternalDomainMetadata;
  error?: string;
}

// Define interfaces for the response structure
interface MetadataResponse {
  function_result: FunctionResult;
  metadata: ExternalDomainMetadata;
  error?: string;
}

interface ExternalDomainMetadata {
  schema_version: string;
  record_types: {
    [key: string]: RecordType;
  };
}

interface RecordType {
  name: string;
  description?: string;
  fields: {
    [key: string]: Field;
  };
  stage_diagram?: StageDiagram;
}

interface Field {
  name: string;
  type: string;
  is_required: boolean;
  is_identifier?: boolean;
  is_indexed?: boolean;
  enum?: {
    values: EnumValue[];
  };
  reference?: {
    refers_to: {
      [key: string]: any;
    };
  };
  collection?: {
    min_length?: number;
  };
}

interface EnumValue {
  key: string;
  name: string;
}

interface StageDiagram {
  controlling_field: string;
  starting_stage: string;
  all_transitions_allowed: boolean;
  stages: {
    [key: string]: {
      transitions_to: string[];
      state: string;
    };
  };
  states: {
    [key: string]: {
      name: string;
      is_end_state?: boolean;
    };
  };
}

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || '';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || '';

// Setup callback server
let callbackServer: Server;
let app: express.Express;

beforeAll(() => {
  // Check if required environment variables are set
  if (!WRIKE_API_KEY) {
    throw new Error('WRIKE_API_KEY environment variable is not set');
  }
  if (!WRIKE_SPACE_GID) {
    throw new Error('WRIKE_SPACE_GID environment variable is not set');
  }

  // Setup callback server
  app = express();
  app.use(bodyParser.json());
  app.post('/callback', (req, res) => {
    res.status(200).send({ status: 'success' });
  });
  
  callbackServer = app.listen(CALLBACK_SERVER_PORT);
  console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
});

afterAll(() => {
  // Cleanup callback server
  if (callbackServer) {
    callbackServer.close();
    console.log('Callback server closed');
  }
  return new Promise(resolve => setTimeout(resolve, 500)); // Give server time to close
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
    payload: {
      connection_data: {
        key: WRIKE_API_KEY,
        org_id: WRIKE_SPACE_GID,
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
        external_sync_unit_id: 'IEAGS6BYI5RFMPPY'
      },
      event_type: 'EXTRACTION_METADATA_START'
    },
    execution_metadata: {
      function_name: 'generate_metadata',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {}
  };
}

describe('Generate Metadata Function Tests', () => {
  // Test 1: Verify the function exists and can be called
  test('Function exists and can be called', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  // Test 2: Verify the function returns the expected structure
  test('Function returns the expected structure', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    const result = response.data.function_result as FunctionResult;
    
    expect(result.status).toBe('success');
    expect(result.message).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  // Test 3: Verify the metadata contains the required record types
  test('Metadata contains required record types', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    const result = response.data.function_result as FunctionResult;
    
    expect(result.metadata.record_types).toBeDefined();
    expect(result.metadata.record_types.tasks).toBeDefined();
    expect(result.metadata.record_types.users).toBeDefined();
  });

  // Test 4: Verify the metadata follows the schema structure
  test('Metadata follows the schema structure', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    const result = response.data.function_result as FunctionResult;
    
    expect(result.metadata.schema_version).toBeDefined();
    expect(Object.keys(result.metadata)).toContain('record_types');
  });

  // Test 5: Verify the fields in the 'tasks' record type
  test('Tasks record type has the expected fields', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    const result = response.data.function_result as FunctionResult;
    const tasksType = result.metadata.record_types.tasks;
    
    // Check basic structure
    expect(tasksType.name).toBe('Task');
    expect(tasksType.fields).toBeDefined();
    
    // Check required fields
    const requiredFields = ['id', 'title', 'status', 'importance', 'created_date', 'updated_date'];
    for (const field of requiredFields) {
      expect(tasksType.fields[field]).toBeDefined();
      expect(tasksType.fields[field].is_required).toBe(true);
    }
    
    // Check field types
    expect(tasksType.fields.id.type).toBe('text');
    expect(tasksType.fields.title.type).toBe('text');
    expect(tasksType.fields.description.type).toBe('rich_text');
    expect(tasksType.fields.status.type).toBe('enum');
    expect(tasksType.fields.importance.type).toBe('enum');
    expect(tasksType.fields.created_date.type).toBe('timestamp');
    expect(tasksType.fields.updated_date.type).toBe('timestamp');
  });

  // Test 6: Verify the fields in the 'users' record type
  test('Users record type has the expected fields', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    const result = response.data.function_result as FunctionResult;
    const usersType = result.metadata.record_types.users;
    
    // Check basic structure
    expect(usersType.name).toBe('User');
    expect(usersType.fields).toBeDefined();
    
    // Check required fields
    const requiredFields = ['id', 'first_name', 'last_name', 'type'];
    for (const field of requiredFields) {
      expect(usersType.fields[field]).toBeDefined();
      expect(usersType.fields[field].is_required).toBe(true);
    }
    
    // Check field types
    expect(usersType.fields.id.type).toBe('text');
    expect(usersType.fields.first_name.type).toBe('text');
    expect(usersType.fields.last_name.type).toBe('text');
    expect(usersType.fields.type.type).toBe('enum');
    expect(usersType.fields.email.type).toBe('text');
  });

  // Test 7: Verify the stage diagram in the 'tasks' record type
  test('Tasks record type has the correct stage diagram', async () => {
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    const result = response.data.function_result as FunctionResult;
    const tasksType = result.metadata.record_types.tasks;
    
    // Check stage diagram structure
    expect(tasksType.stage_diagram).toBeDefined();
    expect(tasksType.stage_diagram?.controlling_field).toBe('status');
    expect(tasksType.stage_diagram?.starting_stage).toBe('Active');
    expect(tasksType.stage_diagram?.all_transitions_allowed).toBe(false);
    
    // Check stages
    const stages = tasksType.stage_diagram?.stages;
    expect(stages).toBeDefined();
    expect(stages?.Active).toBeDefined();
    expect(stages?.Completed).toBeDefined();
    expect(stages?.Deferred).toBeDefined();
    expect(stages?.Cancelled).toBeDefined();
    
    // Check transitions
    expect(stages?.Active.transitions_to).toContain('Completed');
    expect(stages?.Completed.transitions_to).toContain('Active');
    
    // Check states
    const states = tasksType.stage_diagram?.states;
    expect(states).toBeDefined();
    expect(states?.open).toBeDefined();
    expect(states?.in_progress).toBeDefined();
    expect(states?.closed).toBeDefined();
    expect(states?.closed.is_end_state).toBe(true);
  });
});