import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execPromise = promisify(exec);

// Define interfaces for the function result structure
interface FunctionResult {
  status: string;
  message: string;
  metadata: any;
  error?: string;
}

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || '';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || '';
const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH || '';

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
        callback_url: 'http://localhost:8002/callback',
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

describe('Validate Metadata with Chef CLI', () => {
  beforeAll(() => {
    // Check if required environment variables are set
    if (!WRIKE_API_KEY) {
      throw new Error('WRIKE_API_KEY environment variable is not set');
    }
    if (!WRIKE_SPACE_GID) {
      throw new Error('WRIKE_SPACE_GID environment variable is not set');
    }
    if (!CHEF_CLI_PATH) {
      throw new Error('CHEF_CLI_PATH environment variable is not set. Chef CLI is required for this test.');
    }

    // Verify Chef CLI exists and is executable
    try {
      fs.accessSync(CHEF_CLI_PATH, fs.constants.X_OK);
    } catch (error) {
      throw new Error(`Chef CLI at path ${CHEF_CLI_PATH} is not executable: ${error}`);
    }
  });

  test('Generated metadata should be valid according to Chef CLI', async () => {
    // Call the generate_metadata function
    const response = await axios.post(TEST_SERVER_URL, createTestEvent());
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    
    const result = response.data.function_result as FunctionResult;
    expect(result.status).toBe('success');
    expect(result.metadata).toBeDefined();
    
    // Create a temporary file to store the metadata
    const tempFile = path.join(os.tmpdir(), `metadata-${Date.now()}.json`);
    
    try {
      // Write metadata to the temporary file
      fs.writeFileSync(tempFile, JSON.stringify(result.metadata, null, 2));
      console.log(`Metadata written to temporary file: ${tempFile}`);
      
      // Execute Chef CLI to validate the metadata
      const command = `cat ${tempFile} | ${CHEF_CLI_PATH} validate-metadata`;
      console.log(`Executing command: ${command}`);
      
      const { stdout, stderr } = await execPromise(command);
      
      // Log any output for debugging
      if (stdout) console.log(`Chef CLI stdout: ${stdout}`);
      if (stderr) console.log(`Chef CLI stderr: ${stderr}`);
      
      // The test passes if Chef CLI returns an empty output
      expect(stdout.trim()).toBe('');
      expect(stderr.trim()).toBe('');
      
    } catch (error: any) {
      console.error('Error during Chef CLI validation:', error);
      
      // If the error is from the Chef CLI execution, provide detailed error information
      if (error.stdout || error.stderr) {
        console.error('Chef CLI stdout:', error.stdout);
        console.error('Chef CLI stderr:', error.stderr);
        
        // Read the metadata file for debugging
        try {
          const metadata = fs.readFileSync(tempFile, 'utf8');
          console.error('Metadata content that failed validation:', metadata);
        } catch (readError) {
          console.error('Could not read metadata file:', readError);
        }
      }
      
      throw new Error(`Chef CLI validation failed: ${error.message}`);
    } finally {
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFile);
        console.log(`Temporary file removed: ${tempFile}`);
      } catch (unlinkError) {
        console.warn(`Could not remove temporary file ${tempFile}:`, unlinkError);
      }
    }
  });
});