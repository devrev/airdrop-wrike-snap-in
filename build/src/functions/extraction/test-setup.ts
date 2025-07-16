import { AirdropEvent } from '@devrev/ts-adaas';
import { EventType } from './test-utils';
import path from 'path';

/**
 * Sets up the mock spawn function
 * @returns The mock spawn function
 */
export function setupMockSpawn() {
  // Create a mock spawn function
  const mockSpawn = jest.fn().mockResolvedValue(undefined);
  
  // Return the mock function for use in tests
  return mockSpawn;
}

/**
 * Sets up the test environment with all necessary mocks
 * @param mockSpawn The mock spawn function to use
 */
export function setupTestEnvironment(mockSpawn: jest.Mock) {
  // Mock the initial domain mapping
  jest.mock('../generate_initial_mapping/initial_domain_mapping.json', () => ({
    additional_mappings: {}
  }));

  // Mock axios
  jest.mock('axios');

  // Mock the @devrev/ts-adaas module with a proper implementation
  jest.mock('@devrev/ts-adaas', () => {
    const actual = jest.requireActual('@devrev/ts-adaas');
    return {
      ...actual,
      spawn: mockSpawn,
      EventType: require('./test-utils').EventType
    };
  });

  // Mock console methods to prevent test output pollution
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
}

/**
 * Cleans up the test environment
 */
export function cleanupTestEnvironment() {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Restore console mocks
  jest.restoreAllMocks();
}

/**
 * Helper function to create a mock AirdropEvent for testing
 * @param eventType The event type to use
 * @returns A mock AirdropEvent
 */
export function createMockEvent(eventType: EventType): AirdropEvent {
  return {
    context: {
      secrets: {
        service_account_token: 'mock-token'
      },
      snap_in_id: 'mock-snap-in-id',
      snap_in_version_id: 'mock-version-id'
    },
    payload: {
      connection_data: {
        org_id: 'IEACW7SVI4O6BDQE', // Example Space ID
        org_name: 'mock-org-name',
        key: 'mock-api-key',
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
      event_type: eventType,
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
}

/**
 * Verifies that the spawn function was called with the correct parameters
 * @param mockSpawn The mock spawn function
 * @param expectedCallCount The expected number of calls
 * @param workerPathContains Optional string that should be contained in the worker path
 */
export function verifySpawnCalls(mockSpawn: jest.Mock, expectedCallCount: number, workerPathContains?: string) {
  expect(mockSpawn).toHaveBeenCalledTimes(expectedCallCount);
  
  if (expectedCallCount > 0) {
    expect(mockSpawn.mock.calls[0][0]).toHaveProperty('initialDomainMapping');
    expect(mockSpawn.mock.calls[0][0]).toHaveProperty('workerPath');
    expect(mockSpawn.mock.calls[0][0]).toHaveProperty('event');
    expect(mockSpawn.mock.calls[0][0]).toHaveProperty('initialState');
    expect(mockSpawn.mock.calls[0][0]).not.toHaveProperty('options');
    
    if (workerPathContains) {
      expect(mockSpawn.mock.calls[0][0].workerPath).toContain(workerPathContains);
    }
  }
}