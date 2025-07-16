import { ExtractorEventType, ExternalSyncUnit, processTask } from '@devrev/ts-adaas';

/**
 * Worker for handling external sync units extraction
 * This worker is responsible for emitting the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
 */
processTask({
  task: async ({ adapter }) => {
    try {
      console.log('External sync units extraction worker started');
      
      // Create a sample external sync unit
      // In a real implementation, this would fetch data from an external system
      const externalSyncUnits: ExternalSyncUnit[] = [
        {
          id: 'sample-unit-1',
          name: 'Sample Unit 1',
          description: 'This is a sample external sync unit',
          item_count: 10,
          item_type: 'tasks'
        }
      ];

      // Emit the DONE event with the external sync units
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });

      console.log('External sync units extraction completed successfully');
    } catch (error) {
      console.error('Error in external sync units extraction worker:', error);
      
      // Emit an error event if something goes wrong
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error in external sync units extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('External sync units extraction worker timed out');
    
    // Emit an error event if the worker times out
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'External sync units extraction timed out',
      },
    });
  },
});