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
      org_id: 'mock-org-id',
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