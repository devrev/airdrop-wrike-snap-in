import axios from 'axios';

export interface SnapInResponse {
  function_result: {
    can_push: boolean;
    message: string;
    details?: any;
  };
  error?: any;
}

export class SnapInClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async invokeCanPushData(callbackUrl: string): Promise<SnapInResponse> {
    const event = this.createCanPushDataEvent(callbackUrl);
    
    console.log(`Invoking canPushData with callback URL: ${callbackUrl}`);
    try {
      const response = await axios.post(`${this.baseUrl}/handle/sync`, event, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('Received response from snap-in server');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Snap-in server returned error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  private createCanPushDataEvent(callbackUrl: string): any {
    return {
      context: {
        secrets: {
          service_account_token: 'test-token'
        },
        snap_in_version_id: 'test-version'
      },
      payload: {
        connection_data: {
          org_id: 'test-org',
          org_name: 'Test Organization',
          key: 'test-key',
          key_type: 'test-key-type'
        },
        event_context: {
          callback_url: callbackUrl,
          dev_org: 'test-org',
          dev_org_id: 'test-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          external_sync_unit: 'test-sync-unit',
          external_sync_unit_id: 'test-sync-unit-id',
          external_sync_unit_name: 'Test Sync Unit',
          external_system: 'test-system',
          external_system_type: 'test-system-type',
          import_slug: 'test-import',
          mode: 'INITIAL',
          request_id: 'test-request-id',
          snap_in_slug: 'test-snap-in',
          snap_in_version_id: 'test-version-id',
          sync_run: 'test-sync-run',
          sync_run_id: 'test-sync-run-id',
          sync_tier: 'test-tier',
          sync_unit: 'test-unit',
          sync_unit_id: 'test-unit-id',
          uuid: 'test-uuid',
          worker_data_url: 'http://localhost:8003/external-worker'
        },
        event_type: 'TEST_EVENT'
      },
      execution_metadata: {
        devrev_endpoint: 'http://localhost:8003',
        function_name: 'canPushData'
      },
      input_data: {}
    };
  }
}