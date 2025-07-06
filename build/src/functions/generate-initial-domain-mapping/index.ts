import * as fs from 'fs';
import * as path from 'path';

/**
 * Function that generates and returns the Initial Domain Mapping JSON object.
 * 
 * @param events - The events passed to the function
 * @returns The Initial Domain Mapping JSON object
 */
export const generate_initial_domain_mapping = async (events: any[]): Promise<{ success: boolean; message: string; mapping?: any; details?: any }> => {
  try {
    // Log the events for debugging purposes
    console.log('Received events for generating Initial Domain Mapping:', JSON.stringify(events));
    
    // Read the Initial Domain Mapping from the JSON file
    const mappingFilePath = path.resolve(__dirname, 'wrike-initial-domain-mapping.json');
    
    if (!fs.existsSync(mappingFilePath)) {
      return {
        success: false,
        message: 'Initial Domain Mapping file not found',
        details: { file_path: mappingFilePath }
      };
    }
    
    const mappingFileContent = fs.readFileSync(mappingFilePath, 'utf8');
    const mapping = JSON.parse(mappingFileContent);
    
    // Validate the mapping
    if (!mapping || !mapping.format_version || !mapping.additional_mappings || !mapping.additional_mappings.record_type_mappings) {
      return {
        success: false,
        message: 'Invalid Initial Domain Mapping: missing required fields',
        details: { mapping }
      };
    }
    
    return {
      success: true,
      message: 'Successfully generated Initial Domain Mapping',
      mapping
    };
  } catch (error) {
    console.error('Error in generate_initial_domain_mapping function:', error);
    return {
      success: false,
      message: `Error generating Initial Domain Mapping: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: error instanceof Error ? error.stack : String(error) }
    };
  }
};