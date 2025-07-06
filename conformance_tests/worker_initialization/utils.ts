import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
export interface CallbackData {
  event_type?: string;
  event_context?: {
    [key: string]: string;
  };
  event_data?: {
    external_sync_units?: any[];
    artifacts?: any[];
    error?: any;
  };
  worker_metadata?: any;
}

// Setup a callback server to receive events from the worker
export function setupCallbackServer(): Promise<{ server: Server; receivedData: CallbackData[] }> {
  const app = express();
  app.use(express.json());
  
  const receivedData: CallbackData[] = [];
  
  app.post('*', (req: express.Request, res: express.Response) => {
    console.log('Callback received:', JSON.stringify(req.body));
    receivedData.push(req.body);
    res.status(200).send({ status: 'ok' });
  });
  
  return new Promise((resolve) => {
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve({ server, receivedData });
    });
  });
}

// Create a test event for the extraction process
export function createExtractionEvent(eventType: string): any {
  // Check required environment variables
  const apiKey = process.env.WRIKE_API_KEY;
  const spaceId = process.env.WRIKE_SPACE_GID;
  
  if (!apiKey || !spaceId) {
    throw new Error('Required environment variables WRIKE_API_KEY and WRIKE_SPACE_GID must be set');
  }
  
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_version_id: 'test-version-id'
    },
    execution_metadata: {
      function_name: 'extraction_external_sync_unit_check',
      event_type: 'extraction_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    payload: {
      connection_data: {
        key: apiKey,
        org_id: spaceId,
        key_type: 'api_key'
      },
      event_type: eventType,
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        external_sync_unit_id: 'IEAGS6BYI5RFMPPY',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Send a request to the snap-in server
export async function callSnapInServer(event: any): Promise<any> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error calling snap-in server:', error);
    throw error;
  }
}