import { ExtractorEventType, ExternalSyncUnit, processTask } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * Worker for handling external sync units extraction
 * This worker is responsible for fetching projects from Wrike and emitting them as external sync units
 */
processTask({
  task: async ({ adapter }) => {
    try {
      console.log('External sync units extraction worker started');
      
      const event = adapter.event;
      
      // Extract the Wrike API key and Space ID
      const apiKey = event.payload.connection_data.key;
      const spaceId = event.payload.connection_data.org_id;
      
      if (!apiKey) {
        throw new Error('Missing API key in connection_data');
      }
      
      if (!spaceId) {
        throw new Error('Missing Space ID in connection_data');
      }
      
      // Define the Wrike API endpoint
      const wrikeApiEndpoint = 'https://www.wrike.com/api/v4';
      
      console.log(`Fetching projects from Wrike API for space ${spaceId}`);
      
      // Make a GET request to the Wrike API to get folders/projects
      const response = await axios.get(`${wrikeApiEndpoint}/spaces/${encodeURIComponent(spaceId)}/folders`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        params: {
          descendants: true
        },
        timeout: 10000 // 10 seconds timeout
      });

      // Check if the request was successful
      if (response.status !== 200) {
        throw new Error(`Failed to fetch projects with status ${response.status}`);
      }
      
      // Process the response data
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Wrike API');
      }

      // Get the projects from the response
      const projects = response.data.data;
      
      console.log(`Fetched ${projects.length} projects, now getting task counts`);
      
      // Transform the projects into external sync units with task counts
      const externalSyncUnits: ExternalSyncUnit[] = [];
      
      // For each project, get the task count
      for (const project of projects) {
        try {
          // Make a GET request to get tasks for this project to count them
          const tasksResponse = await axios.get(`${wrikeApiEndpoint}/folders/${encodeURIComponent(project.id)}/tasks`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            },
            params: {
              descendants: true,
              subTasks: true
            },
            timeout: 10000 // 10 seconds timeout
          });
          
          // Get the task count
          const taskCount = tasksResponse.data && tasksResponse.data.data ? tasksResponse.data.data.length : 0;
          
          // Add the project with task count to external sync units
          externalSyncUnits.push({
            id: project.id,
            name: project.title,
            description: project.description || `Wrike project: ${project.title}`,
            item_count: taskCount,
            item_type: 'tasks'
          });
        } catch (error) {
          console.error(`Error fetching tasks for project ${project.id}:`, error);
          // Still add the project, but with task count 0
          externalSyncUnits.push({
            id: project.id,
            name: project.title,
            description: project.description || `Wrike project: ${project.title}`,
            item_count: 0, // Error fetching task count
            item_type: 'tasks'
          });
        }
      }
      
      console.log(`Successfully transformed ${externalSyncUnits.length} projects into external sync units`);
      
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