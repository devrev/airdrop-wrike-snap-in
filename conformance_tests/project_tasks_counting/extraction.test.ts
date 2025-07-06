import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables
const WRIKE_API_KEY = process.env.WRIKE_API_KEY;
const WRIKE_SPACE_GID = process.env.WRIKE_SPACE_GID;

// Test data
const TEST_PROJECT_ID = 'IEAGS6BYI5RFMPPY';

// Interfaces
interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_count?: number;
  item_type?: string;
}

describe('Extraction Function Conformance Tests', () => {
  let callbackServer: Server;
  let receivedExternalSyncUnits: ExternalSyncUnit[] = [];
  
  // Setup callback server before tests
  beforeAll(async () => {
    // Verify environment variables
    if (!WRIKE_API_KEY) {
      throw new Error('WRIKE_API_KEY environment variable is not set');
    }
    if (!WRIKE_SPACE_GID) {
      throw new Error('WRIKE_SPACE_GID environment variable is not set');
    }
    
    // Setup callback server to receive external sync units
    const app = express();
    app.use(express.json());
    
    app.post('*', (req, res) => {
      console.log('Callback server received request:', JSON.stringify(req.body));
      
      // Extract external sync units from the correct location in the response
      if (req.body && req.body.event_data && req.body.event_data.external_sync_units) {
        receivedExternalSyncUnits = req.body.event_data.external_sync_units;
      }
      if (req.body && req.body.external_sync_units) {
        receivedExternalSyncUnits = req.body.external_sync_units;
      }
      res.status(200).send('OK');
    });
    
    return new Promise<void>((resolve) => {
      callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
        console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
        resolve();
      });
    });
  });
  
  // Clean up after tests
  afterAll(async () => {
    return new Promise<void>((resolve) => {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    });
  });
  
  // Reset received data before each test
  beforeEach(() => {
    receivedExternalSyncUnits = [];
  });
  
  // Test 1: Verify that the extraction function exists and can be invoked
  test('extraction function exists and can be invoked', async () => {
    const response = await axios.post(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'extraction'
      },
      payload: {
        event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
        connection_data: {
          key: WRIKE_API_KEY,
          org_id: WRIKE_SPACE_GID
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        }
      },
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
  });
  
  // Test 2: Verify that the extraction function handles the EXTRACTION_EXTERNAL_SYNC_UNITS_START event type
  test('extraction function handles EXTRACTION_EXTERNAL_SYNC_UNITS_START event type', async () => {
    const response = await axios.post(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'extraction'
      },
      payload: {
        event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
        connection_data: {
          key: WRIKE_API_KEY,
          org_id: WRIKE_SPACE_GID
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        }
      },
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('completed successfully');
    
    // Wait for callback to be processed (up to 10 seconds)
    await waitForCallback(10000);
  });
  
  // Test 3: Verify that the extraction function fetches projects with task counts
  test('extraction function fetches projects with task counts', async () => {
    const response = await axios.post(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'extraction'
      },
      payload: {
        event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
        connection_data: {
          key: WRIKE_API_KEY,
          org_id: WRIKE_SPACE_GID
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`,
          external_sync_unit_id: TEST_PROJECT_ID
        }
      },
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    // Wait for callback to be processed (up to 10 seconds)
    await waitForCallback(10000);
    
    // Verify that external sync units were received
    expect(receivedExternalSyncUnits.length).toBeGreaterThan(0);
    
    // Verify that each external sync unit has an item_count property
    for (const unit of receivedExternalSyncUnits) {
      expect(unit).toHaveProperty('id');
      expect(unit).toHaveProperty('name');
      expect(unit).toHaveProperty('description');
      expect(unit).toHaveProperty('item_count');
      expect(typeof unit.item_count).toBe('number');
    }
  });
  
  // Helper function to wait for callback
  async function waitForCallback(timeout: number): Promise<void> {
    console.log('Waiting for callback data...');
    const startTime = Date.now();
    while (receivedExternalSyncUnits.length === 0) {
      if (Date.now() - startTime > timeout) {
        console.error('Timed out waiting for callback. No external sync units received.');
        throw new Error(`Timed out waiting for callback after ${timeout}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Still waiting... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
    }
  }
});