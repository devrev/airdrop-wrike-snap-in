import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';

// Define the state type for the extraction process
type ExtractorState = {
  externalSyncUnits: {
    completed: boolean;
  };
};

// Process the external sync units extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Starting external sync units extraction test');

    // Create sample external sync units
    const externalSyncUnits: ExternalSyncUnit[] = [
      {
        id: 'esu-1',
        name: 'Test Project 1',
        description: 'A test project for external sync units extraction',
        item_count: 10,
        item_type: 'project'
      },
      {
        id: 'esu-2',
        name: 'Test Repository 1',
        description: 'A test repository for external sync units extraction',
        item_count: 25,
        item_type: 'repository'
      }
    ];

    // Update the state to indicate completion
    adapter.state = {
      ...adapter.state,
      externalSyncUnits: {
        completed: true
      }
    };

    // Emit the completion event with the sample external sync units
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
      external_sync_units: externalSyncUnits
    });

    console.log('External sync units extraction test completed successfully');
  },
  onTimeout: async ({ adapter }) => {
    console.error('External sync units extraction test timed out');
    
    // Emit an error event if the task times out
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'External sync units extraction test timed out. Lambda timeout.'
      }
    });
  }
});