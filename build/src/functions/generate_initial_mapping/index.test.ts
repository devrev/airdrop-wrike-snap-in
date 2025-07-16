import { run } from './index';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';
import initialDomainMapping from './initial_domain_mapping.json';

describe('Generate Initial Mapping Function', () => {
  // Helper function to create a mock AirdropEvent
  const createMockEvent = (): AirdropEvent => ({
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
  });

  beforeEach(() => {
    // Mock console.log and console.error to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console mocks
    jest.restoreAllMocks();
  });

  it('should return the Initial Domain Mapping when invoked', async () => {
    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Successfully generated Initial Domain Mapping',
      mapping: initialDomainMapping
    });
  });

  it('should throw an error if events parameter is not an array', async () => {
    // Call the function with invalid input
    const invalidInput = null as unknown as AirdropEvent[];
    
    // Expect the function to throw an error
    await expect(run(invalidInput)).rejects.toThrow('Invalid input: events must be an array');
  });

  it('should validate the structure of the Initial Domain Mapping', async () => {
    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the mapping structure
    expect(result.mapping).toHaveProperty('additional_mappings');
    expect(result.mapping.additional_mappings).toHaveProperty('record_type_mappings');
    
    // Verify record type mappings
    const recordTypeMappings = result.mapping.additional_mappings.record_type_mappings;
    expect(recordTypeMappings).toHaveProperty('tasks');
    expect(recordTypeMappings).toHaveProperty('users');
    
    // Verify tasks mapping
    const tasksMapping = recordTypeMappings.tasks;
    expect(tasksMapping).toHaveProperty('default_mapping');
    expect(tasksMapping).toHaveProperty('possible_record_type_mappings');
    expect(tasksMapping.default_mapping.object_type).toBe('ticket');
    
    // Verify users mapping
    const usersMapping = recordTypeMappings.users;
    expect(usersMapping).toHaveProperty('default_mapping');
    expect(usersMapping).toHaveProperty('possible_record_type_mappings');
    expect(usersMapping.default_mapping.object_type).toBe('revu');
  });
});