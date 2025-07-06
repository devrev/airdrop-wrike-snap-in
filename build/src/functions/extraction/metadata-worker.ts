import { ExtractorEventType, processTask, RepoInterface } from '@devrev/ts-adaas';
import fs from 'fs';
import * as path from 'path';

// Define the state type for the metadata extraction process
type ExtractorState = {
  metadata: {
    completed: boolean;
  };
};

// Process the metadata extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Starting metadata extraction');

    try {
      // Read the External Domain Metadata from the JSON file
      const metadataFilePath = path.resolve(__dirname, '../generate-external-domain-metadata/wrike-domain-metadata.json');
      
      if (!fs.existsSync(metadataFilePath)) {
        throw new Error(`External Domain Metadata file not found at: ${metadataFilePath}`);
      }
      
      const metadataFileContent = fs.readFileSync(metadataFilePath, 'utf8');
      const metadata = JSON.parse(metadataFileContent);
      
      // Validate the metadata
      if (!metadata || !metadata.record_types || !metadata.record_types.tasks || !metadata.record_types.users) {
        throw new Error('Invalid External Domain Metadata: missing required record types');
      }

      // Initialize the repository for external domain metadata
      const repos = [{
        itemType: 'external_domain_metadata',
        normalize: (data: any) => ({
          id: 'external_domain_metadata',
          created_date: new Date().toISOString(),
          modified_date: new Date().toISOString(),
          data
        })
      } as RepoInterface];
      
      adapter.initializeRepos(repos);

      // Get the repository for external domain metadata
      const repo = adapter.getRepo('external_domain_metadata');
      
      if (!repo) {
        throw new Error('Failed to get repository for external domain metadata');
      }

      // Push the metadata directly to the repository
      try {
        // Push the metadata to the repository
        console.log('Pushing metadata to repository...');
        const pushResult = await repo.push([metadata]);
        
        if (!pushResult) {
          console.error('Failed to push metadata to repository');
          throw new Error('Failed to push metadata to repository');
        }
        
        console.log('Metadata pushed to repository successfully');
        
        // Force upload any remaining items
        console.log('Uploading any remaining items...');
        const uploadResult = await repo.upload();
        
        if (uploadResult) {
          console.error('Error uploading metadata:', uploadResult);
          throw new Error(`Failed to upload metadata: ${uploadResult.message || 'Unknown error'}`);
        }
        console.log('All metadata uploaded successfully');
      } catch (callbackError) {
        console.error('Warning: Error sending metadata to callback URL:', callbackError);
        // Continue with the process even if the direct callback fails, but log the error
        console.error('Callback error details:', JSON.stringify(callbackError));
      }

      // Update the state to indicate completion
      adapter.state = {
        metadata: { 
          completed: true
        }
      };

      // Emit the completion event
      try {
        console.log('Metadata extraction completed successfully, emitting completion event.');
        await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
        console.log('Successfully emitted completion event');
      } catch (emitError) {
        console.error('Error emitting completion event:', emitError);
        throw emitError; // Re-throw to ensure the error is properly handled
      }
      
      console.log('Metadata extraction completed successfully');
    } catch (error: any) {
      console.error('Error during metadata extraction:', error instanceof Error ? error.message : error);
      
      // Emit an error event with detailed error message
      try {
        await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
          error: {
            message: `Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      } catch (emitError) {
        console.error('Error emitting error event:', emitError);
      }
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Metadata extraction timed out');
    
    // Emit an error event if the task times out
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: {
        message: 'Metadata extraction timed out. Lambda timeout.'
      }
    });
  }
});