import * as fs from 'fs';
import * as path from 'path';

/**
 * Function that generates and returns the External Domain Metadata JSON object.
 * 
 * @param events - The events passed to the function
 * @returns The External Domain Metadata JSON object
 */
export const generate_external_domain_metadata = async (events: any[]): Promise<{ success: boolean; message: string; metadata?: any; details?: any }> => {
  try {
    // Log the events for debugging purposes
    console.log('Received events for generating External Domain Metadata:', JSON.stringify(events));
    
    // Read the External Domain Metadata from the JSON file
    const metadataFilePath = path.resolve(__dirname, 'wrike-domain-metadata.json');
    
    if (!fs.existsSync(metadataFilePath)) {
      return {
        success: false,
        message: 'External Domain Metadata file not found',
        details: { file_path: metadataFilePath }
      };
    }
    
    const metadataFileContent = fs.readFileSync(metadataFilePath, 'utf8');
    const metadata = JSON.parse(metadataFileContent);
    
    // Validate the metadata
    if (!metadata || !metadata.record_types || !metadata.record_types.tasks || !metadata.record_types.users) {
      return {
        success: false,
        message: 'Invalid External Domain Metadata: missing required record types',
        details: { metadata }
      };
    }
    
    return {
      success: true,
      message: 'Successfully generated External Domain Metadata',
      metadata
    };
  } catch (error) {
    console.error('Error in generate_external_domain_metadata function:', error);
    return {
      success: false,
      message: `Error generating External Domain Metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};