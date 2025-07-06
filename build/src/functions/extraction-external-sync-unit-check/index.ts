import { EventType, spawn } from '@devrev/ts-adaas';
import path from 'path';
import { readInitialDomainMapping, readInitialDomainMappingAsString, InitialDomainMapping } from '../../core/domain-mapping-utils';

/**
 * Function that tests the 'external sync units' part of the extraction workflow.
 * 
 * @param events - The events passed to the function from Airdrop platform
 * @returns An object indicating whether the external sync units extraction was successful
 */
export const extraction_external_sync_unit_check = async (events: any[]): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    // Log the events for debugging purposes
    console.log('Received events for external sync units extraction test:', JSON.stringify(events));
    
    if (!events || events.length === 0) {
      return {
        success: false,
        message: 'No events provided'
      };
    }

    const event = events[0];
    
    // Check if the event has the necessary structure
    if (!event.payload || !event.payload.event_type) {
      return {
        success: false,
        message: 'Event payload or event_type is missing',
        details: { received_event: event }
      };
    }

    // Override the event type to ensure we're testing the external sync units extraction
    event.payload.event_type = EventType.ExtractionExternalSyncUnitsStart;

    // Ensure the event has all required properties for the Airdrop SDK
    if (!event.payload.event_context) {
      event.payload.event_context = {};
    }

    // Add required properties to event_context if they don't exist
    const requiredProps = {
      callback_url: 'https://example.com/callback',
      dev_org: 'test-org',
      dev_org_id: 'test-org-id',
      dev_user: 'test-user',
      dev_user_id: 'test-user-id',
      external_sync_unit: 'test-sync-unit',
      external_sync_unit_id: 'test-sync-unit-id',
      external_sync_unit_name: 'Test Sync Unit',
      external_system: 'test-system',
      external_system_type: 'test-system-type',
      import_slug: 'test-import-slug',
      mode: 'INITIAL',
      request_id: 'test-request-id',
      snap_in_slug: 'test-snap-in-slug',
      snap_in_version_id: 'test-version-id',
      sync_run: 'test-sync-run',
      sync_run_id: 'test-sync-run-id',
      sync_tier: 'test-tier',
      sync_unit: 'test-unit',
      sync_unit_id: 'test-unit-id',
      uuid: 'test-uuid',
      worker_data_url: 'https://example.com/worker-data'
    };

    // Add missing properties to event_context
    Object.entries(requiredProps).forEach(([key, value]) => {
      if (!event.payload.event_context[key]) {
        event.payload.event_context[key] = value;
      }
    });

    // Check if the event has the necessary context
    if (!event.context || !event.context.secrets || !event.context.secrets.service_account_token) {
      return {
        success: false,
        message: 'Event is missing required authentication context',
        details: { missing_fields: 'context.secrets.service_account_token' }
      };
    }

    // Initial state for the extraction process
    const initialState = {
      externalSyncUnits: {
        completed: false
      }
    };

    try {
      // Get the absolute path to the worker file
      const workerPath = path.resolve(__dirname, 'worker.ts');

      // Read the initial domain mapping
      const initialDomainMapping = readInitialDomainMapping();

      // Check if domain mapping was successfully read
      if (initialDomainMapping === null) {
        return {
          success: false,
          message: 'Failed to read initial domain mapping',
          details: { error: 'Domain mapping file could not be read as string' }
        };
      }
      
      // Spawn a worker to handle the extraction
      await spawn({
        event,
        initialDomainMapping,
        initialState,
        workerPath
      });

      return {
        success: true,
        message: 'External sync units extraction test completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute external sync units extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.stack : String(error) }
      };
    }
  } catch (error) {
    console.error('Error in extraction_external_sync_unit_check function:', error);
    return {
      success: false,
      message: `Error testing external sync units extraction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};