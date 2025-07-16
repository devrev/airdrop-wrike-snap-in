import { ExtractorEventType, processTask } from '@devrev/ts-adaas';
import externalDomainMetadata from '../generate_metadata/external_domain_metadata.json';

/**
 * Worker for handling metadata extraction
 * This worker is responsible for pushing the External Domain Metadata to the repository
 */
processTask({
  task: async ({ adapter }) => {
    try {
      console.log('Metadata extraction worker started');
      
      // Initialize the repository for external domain metadata
      adapter.initializeRepos([
        {
          itemType: 'external_domain_metadata'
          // No normalize function since we don't want to normalize the metadata
        }
      ]);
      
      // Get the repository
      const metadataRepo = adapter.getRepo('external_domain_metadata');
      
      if (!metadataRepo) {
        throw new Error('Failed to initialize external_domain_metadata repository');
      }
      
      console.log('Pushing external domain metadata to repository');
      
      // Push the metadata to the repository
      try {
        // Note: We're not normalizing the metadata as per the requirement
        const pushResult = await metadataRepo.push([externalDomainMetadata]);
        
        if (!pushResult) {
          throw new Error('Failed to push metadata to repository');
        }
        
        // Make sure any remaining items are uploaded
        const uploadError = await metadataRepo.upload();
        
        if (uploadError) {
          throw new Error(`Failed to upload metadata: ${JSON.stringify(uploadError)}`);
        }
        
        console.log('Successfully pushed external domain metadata');
      } catch (uploadError) {
        throw new Error(`Error during metadata upload: ${uploadError instanceof Error ? uploadError.message : JSON.stringify(uploadError)}`);
      }
      // Emit the DONE event
      await adapter.emit(ExtractorEventType.ExtractionMetadataDone);

      console.log('Metadata extraction completed successfully');
    } catch (error) {
      console.error('Error in metadata extraction worker:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in metadata extraction';
      // Emit an error event if something goes wrong
      await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
        error: {
          message: errorMessage,
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Metadata extraction worker timed out');
    
    // Emit an error event if the worker times out
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: {
        message: 'Metadata extraction timed out',
      },
    });
  },
});