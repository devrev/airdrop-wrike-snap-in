import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

// Promisify exec for cleaner async/await usage
const execAsync = promisify(exec);

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';

// Environment variables check
const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID;
const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH || '';

// Test data
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY';

describe('External Domain Metadata Chef CLI Validation', () => {
  // Check required environment variables before all tests
  beforeAll(() => {
    if (!WRIKE_API_KEY) {
      throw new Error('WRIKE_API_KEY environment variable is required');
    }
    if (!WRIKE_SPACE_GID) {
      throw new Error('WRIKE_SPACE_GID environment variable is required');
    }
  });

  test('External Domain Metadata validates successfully with Chef CLI', async () => {
    // Skip test if Chef CLI path is not provided
    if (!CHEF_CLI_PATH) {
      console.warn('Skipping Chef CLI validation test: CHEF_CLI_PATH environment variable is not set');
      throw new Error('CHEF_CLI_PATH environment variable is required for Chef CLI validation test');
    } else if (!fs.existsSync(CHEF_CLI_PATH)) {
      throw new Error(`Chef CLI executable not found at path: ${CHEF_CLI_PATH}`);
    }
  });

  test('External Domain Metadata validates successfully with Chef CLI', async () => {
    // Step 1: Call the generate_external_domain_metadata function
    const event = createTestEvent('generate_external_domain_metadata');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.metadata).toBeDefined();
    
    const metadata = response.data.function_result.metadata;
    
    // Step 2: Save metadata to a temporary file for validation
    const tempFilePath = path.join(__dirname, 'temp_metadata.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(metadata, null, 2));
    
    try {
      // Step 3: Validate the metadata using Chef CLI
      const command = `cat ${tempFilePath} | ${CHEF_CLI_PATH} validate-metadata`;
      
      console.log(`Executing command: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      
      // Log any output for debugging
      if (stdout) console.log('Chef CLI stdout:', stdout);
      if (stderr) console.log('Chef CLI stderr:', stderr);
      
      // The test passes if Chef CLI returns an empty output (no errors)
      expect(stdout.trim()).toBe('');
      expect(stderr.trim()).toBe('');
      
    } catch (error) {
      console.error('Chef CLI validation failed:', error instanceof Error ? error.message : String(error));
      
      // Type guard to check if error has stdout/stderr properties
      if (error && typeof error === 'object') {
        const execError = error as { stdout?: string; stderr?: string; message?: string };
        
        // If we have the error output, include it in the test failure
        if (execError.stdout) console.error('Chef CLI stdout:', execError.stdout);
        if (execError.stderr) console.error('Chef CLI stderr:', execError.stderr);
        
      }
      
      // Re-throw with more context
      throw new Error(`Chef CLI validation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
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
        external_sync_unit_id: TEST_PROJECT_ID
      }
    }
  };
}