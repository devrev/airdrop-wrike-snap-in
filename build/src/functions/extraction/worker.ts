import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';
import { WrikeClient } from '../../core/wrike-client';

// Define the state type for the extraction process
type ExtractorState = {
  externalSyncUnits: {
    completed: boolean;
    spaceId: string;
    apiKey: string;
  };
};

// Process the external sync units extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Starting external sync units extraction');

    try {
      const { spaceId, apiKey } = adapter.state.externalSyncUnits;
      
      if (!spaceId || !apiKey) {
        throw new Error('Missing required state parameters: spaceId or apiKey');
      }

      console.log(`Using Space ID: ${spaceId}`);

      // Create a Wrike client and fetch projects
      const wrikeClient = new WrikeClient(apiKey);
      const projects = await wrikeClient.getProjects(spaceId);

      console.log(`Fetched ${projects.length} projects from Wrike`);

      // Transform projects into external sync units with task counts
      const externalSyncUnits: ExternalSyncUnit[] = [];
      
      // Process each project to get task counts
      for (const project of projects) {
        try {
          // Fetch tasks for this project to get the count
          const tasks = await wrikeClient.getProjectTasks(project.id);
          const taskCount = tasks.length;
          
          externalSyncUnits.push({
            id: project.id,
            name: project.title,
            description: project.description || `Wrike project: ${project.title}`,
            item_count: taskCount, // Use the actual task count
            item_type: 'project'
          });
          
          console.log(`Project ${project.title} (${project.id}) has ${taskCount} tasks`);
        } catch (error) {
          console.error(`Error fetching tasks for project ${project.id}:`, error);
          // Still include the project, but with a default item_count of 0
          externalSyncUnits.push({
            id: project.id,
            name: project.title,
            description: project.description || `Wrike project: ${project.title}`,
            item_count: 0, // Default to 0 if we couldn't fetch tasks
            item_type: 'project'
          });
        }
      }

      // Update the state to indicate completion
      adapter.state = {
        ...adapter.state,
        externalSyncUnits: {
          ...adapter.state.externalSyncUnits,
          completed: true
        }
      };

      // Emit the completion event with the external sync units
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits
      });

      console.log('External sync units extraction completed successfully');
    } catch (error) {
      console.error('Error during external sync units extraction:', error);
      
      // Emit an error event
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: `Failed to extract external sync units: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('External sync units extraction timed out');
    
    // Emit an error event if the task times out
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'External sync units extraction timed out. Lambda timeout.'
      }
    });
  }
});