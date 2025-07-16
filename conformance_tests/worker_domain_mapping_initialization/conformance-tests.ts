import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { EventType } from '@devrev/ts-adaas';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 10000; // 10 seconds per test

// Environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY || 'test-api-key';
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID || 'test-space-id';
const TEST_EXTERNAL_SYNC_UNIT_ID = 'IEAGS6BYI5RFMPPY';

// Setup callback server to capture responses
const app = express();
app.use(bodyParser.json());

let lastCallbackData: any = null;
app.post('/callback', (req, res) => {
  console.log('Callback received:', JSON.stringify(req.body));
  lastCallbackData = req.body;
  res.status(200).send({ status: 'success' });
});

const server = app.listen(CALLBACK_SERVER_PORT, () => {
  console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
});

// Helper function to create a test event
function createTestEvent(functionName: string, eventType: string = EventType.ExtractionExternalSyncUnitsStart) {
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
        org_id: WRIKE_SPACE_GID,
        org_name: 'Test Org',
        key: WRIKE_API_KEY,
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-org',
        dev_org_id: 'test-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: 'test-unit',
        external_sync_unit_id: TEST_EXTERNAL_SYNC_UNIT_ID,
        external_sync_unit_name: 'Test Unit',
        external_system: 'wrike',
        external_system_type: 'wrike',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'test-version-id',
        sync_run: 'test-run',
        sync_run_id: 'test-run-id',
        sync_tier: 'test-tier',
        sync_unit: 'test-unit',
        sync_unit_id: 'test-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType
    },
    execution_metadata: {
      function_name: functionName,
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {}
  };
}

// Tests
async function runTests() {
  try {
    console.log('Starting conformance tests...');

    // Test 1: Basic connectivity test
    console.log('\n--- Test 1: Basic connectivity test ---');
    try {
      const healthcheckEvent = createTestEvent('healthcheck');
      const response = await axios.post(TEST_SERVER_URL, healthcheckEvent);
      
      if (response.status === 200) {
        console.log('✅ Test server is accessible');
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Test server connectivity test failed:', error);
      process.exit(1);
    }

    // Test 2: Simple test - extraction_external_sync_unit_check function
    console.log('\n--- Test 2: Testing extraction_external_sync_unit_check function ---');
    try {
      const externalSyncUnitEvent = createTestEvent('extraction_external_sync_unit_check');
      const response = await axios.post(TEST_SERVER_URL, externalSyncUnitEvent);
      
      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
      
      const result = response.data;
      console.log('Function result:', JSON.stringify(result));
      
      if (result.function_result && result.function_result.status === 'success') {
        console.log('✅ extraction_external_sync_unit_check function executed successfully');
      } else {
        throw new Error('Function did not return success status');
      }
    } catch (error) {
      console.error('❌ extraction_external_sync_unit_check test failed:', error);
      process.exit(1);
    }

    // Test 3: Complex test - data_extraction_check function
    console.log('\n--- Test 3: Testing data_extraction_check function ---');
    try {
      const dataExtractionEvent = createTestEvent('data_extraction_check', EventType.ExtractionDataStart);
      const response = await axios.post(TEST_SERVER_URL, dataExtractionEvent);
      
      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
      
      const result = response.data;
      console.log('Function result:', JSON.stringify(result));
      
      if (result.function_result && result.function_result.status === 'success') {
        console.log('✅ data_extraction_check function executed successfully');
      } else {
        throw new Error('Function did not return success status');
      }
    } catch (error) {
      console.error('❌ data_extraction_check test failed:', error);
      process.exit(1);
    }

    console.log('\n✅ All conformance tests passed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Conformance tests failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    server.close();
  }
}

// Set timeout for the entire test suite
const testTimeout = setTimeout(() => {
  console.error('❌ Test suite timed out after 120 seconds');
  server.close();
  process.exit(1);
}, 120000);

// Run tests
runTests().finally(() => clearTimeout(testTimeout));