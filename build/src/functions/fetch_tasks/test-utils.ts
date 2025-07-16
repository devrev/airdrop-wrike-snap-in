import { AirdropEvent } from '@devrev/ts-adaas';

// Mock for EventType from @devrev/ts-adaas
export enum EventType {
  // Extraction
  ExtractionExternalSyncUnitsStart = 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
  ExtractionMetadataStart = 'EXTRACTION_METADATA_START',
  ExtractionDataStart = 'EXTRACTION_DATA_START',
  ExtractionDataContinue = 'EXTRACTION_DATA_CONTINUE',
  ExtractionDataDelete = 'EXTRACTION_DATA_DELETE',
  ExtractionAttachmentsStart = 'EXTRACTION_ATTACHMENTS_START',
  ExtractionAttachmentsContinue = 'EXTRACTION_ATTACHMENTS_CONTINUE',
  ExtractionAttachmentsDelete = 'EXTRACTION_ATTACHMENTS_DELETE'
}

/**
 * Helper function to create a mock AirdropEvent for testing
 */
export const createMockEvent = (): AirdropEvent => ({
  context: {
    secrets: {
      service_account_token: 'mock-token'
    },
    snap_in_id: 'mock-snap-in-id',
    snap_in_version_id: 'mock-version-id'
  },
  payload: {
    connection_data: {
      org_id: 'IEACW7SVI4O6BDQE',
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
      external_sync_unit_id: 'IEACW7SVI4OMYFIY', // Example Project ID from Postman collection
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
    event_type: EventType.ExtractionDataStart,
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

/**
 * Mock Wrike API response for tasks
 */
export const mockWrikeTasksResponse = {
  data: [
    {
      id: 'IEACW7SVKQZEBEUN',
      title: 'Task 1',
      description: 'This is task 1',
      status: 'Active',
      importance: 'Normal',
      createdDate: '2023-01-01T00:00:00Z',
      updatedDate: '2023-01-02T00:00:00Z',
      completedDate: null,
      dueDate: '2023-01-10T00:00:00Z',
      parentIds: ['IEACW7SVI4OMYFIY'],
      responsibleIds: ['KUAFY3BJ'],
      authorIds: ['KUAFZBCJ'],
      customStatusId: 'ABCD1234',
      permalink: 'https://www.wrike.com/open.htm?id=123456789'
    },
    {
      id: 'IEACW7SVKQPX4WHN',
      title: 'Task 2',
      description: 'This is task 2',
      status: 'Completed',
      importance: 'High',
      createdDate: '2023-02-01T00:00:00Z',
      updatedDate: '2023-02-02T00:00:00Z',
      completedDate: '2023-02-05T00:00:00Z',
      dueDate: '2023-02-10T00:00:00Z',
      parentIds: ['IEACW7SVI4OMYFIY'],
      responsibleIds: ['KUAFY3BJ'],
      authorIds: ['KUAFZBCJ'],
      customStatusId: 'EFGH5678',
      permalink: 'https://www.wrike.com/open.htm?id=987654321'
    }
  ]
};