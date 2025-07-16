import { run } from './index';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

describe('Healthcheck Function', () => {
  it('should return a success message when invoked', async () => {
    // Create a mock AirdropEvent
    const mockEvent: AirdropEvent = {
      context: {
        secrets: {
          service_account_token: 'mock-token'
        },
        snap_in_id: 'mock-snap-in-id',
        snap_in_version_id: 'mock-version-id'
      },
      payload: {
        connection_data: {
          org_id: 'mock-org-id',
          org_name: 'mock-org-name',
          key: 'mock-key',
          key_type: 'mock-key-type'
        },
        event_context: {
          callback_url: 'mock-callback-url',
          dev_org: 'mock-dev-org',
          dev_org_id: 'mock-dev-org-id',
          dev_user: 'mock-dev-user',
          dev_user_id: 'mock-dev-user-id',
          external_sync_unit: 'mock-external-sync-unit',
          external_sync_unit_id: 'mock-external-sync-unit-id',
          external_sync_unit_name: 'mock-external-sync-unit-name',
          external_system: 'mock-external-system',
          external_system_type: 'mock-external-system-type',
          import_slug: 'mock-import-slug',
          mode: 'INITIAL',
          request_id: 'mock-request-id',
          snap_in_slug: 'mock-snap-in-slug',
          snap_in_version_id: 'mock-snap-in-version-id',
          sync_run: 'mock-sync-run',
          sync_run_id: 'mock-sync-run-id',
          sync_tier: 'mock-sync-tier',
          sync_unit: 'mock-sync-unit',
          sync_unit_id: 'mock-sync-unit-id',
          uuid: 'mock-uuid',
          worker_data_url: 'mock-worker-data-url'
        },
        event_type: EventType.ExtractionMetadataStart,
        event_data: {}
      },
      execution_metadata: {
        devrev_endpoint: 'mock-endpoint'
      },
      input_data: { 
        global_values: {}, 
        event_sources: {}
      }
    };

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Healthcheck function successfully invoked'
    });
  });

  it('should throw an error if something goes wrong', async () => {
    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock console.log to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Create a mock event that will cause an error
    const mockEvent = null as unknown as AirdropEvent;

    // Expect the function to throw an error
    await expect(run([mockEvent])).rejects.toThrow();

    // Restore console.error
    jest.restoreAllMocks();
  });
});