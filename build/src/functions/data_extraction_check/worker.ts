import { ExtractorEventType, processTask } from '@devrev/ts-adaas';

/**
 * Worker for handling data extraction
 * This worker is responsible for emitting the EXTRACTION_DATA_DONE event
 */
processTask({
  task: async ({ adapter }) => {
    try {
      console.log('Data extraction worker started');
      
      // In a real implementation, this would extract data from an external system
      // and push it to repositories
      
      // For this test function, we'll just emit the DONE event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);

      console.log('Data extraction completed successfully');
    } catch (error) {
      console.error('Error in data extraction worker:', error);
      
      // Emit an error event if something goes wrong
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error in data extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Data extraction worker timed out');
    
    // Emit an error event if the worker times out
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Data extraction timed out',
      },
    });
  },
});