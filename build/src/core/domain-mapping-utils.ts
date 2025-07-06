import * as fs from 'fs';
import * as path from 'path';

/**
 * Type definition for the initial domain mapping
 */
export type InitialDomainMapping = {
  format_version: string;
  devrev_metadata_version: number;
  additional_mappings: Record<string, any>;
};

/**
 * Reads the initial domain mapping from the JSON file
 * 
 * @returns The initial domain mapping as an object
 */
export function readInitialDomainMapping(): InitialDomainMapping | null {
  try {
    const mappingFilePath = path.resolve(__dirname, '../functions/generate-initial-domain-mapping/wrike-initial-domain-mapping.json');
    
    if (!fs.existsSync(mappingFilePath)) {
      console.error('Initial Domain Mapping file not found at:', mappingFilePath);
      return null;
    }
    
    const fileContent = fs.readFileSync(mappingFilePath, 'utf8');
    return JSON.parse(fileContent) as InitialDomainMapping;
  } catch (error) {
    console.error('Error reading Initial Domain Mapping file:', error);
    return null;
  }
}

/**
 * Reads the initial domain mapping from the JSON file as a string
 * 
 * @returns The initial domain mapping as a JSON string
 */
export function readInitialDomainMappingAsString(): string | null {
  try {
    const mappingFilePath = path.resolve(__dirname, '../functions/generate-initial-domain-mapping/wrike-initial-domain-mapping.json');
    
    if (!fs.existsSync(mappingFilePath)) {
      console.error('Initial Domain Mapping file not found at:', mappingFilePath);
      return null;
    }
    
    return fs.readFileSync(mappingFilePath, 'utf8');
  } catch (error) {
    console.error('Error reading Initial Domain Mapping file as string:', error);
    return null;
  }
}