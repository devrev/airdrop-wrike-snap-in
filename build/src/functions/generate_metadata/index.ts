import { AirdropEvent } from '@devrev/ts-adaas';
import externalDomainMetadata from './external_domain_metadata.json';

/**
 * A function that generates and returns the External Domain Metadata JSON object.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns The External Domain Metadata JSON object
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  metadata: any
}> {
  try {
    // Validate input parameters
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    // Log the event for debugging purposes
    console.log('Generate metadata function invoked');
    
    // Return the External Domain Metadata
    return {
      status: 'success',
      message: 'Successfully generated External Domain Metadata',
      metadata: externalDomainMetadata
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in generate metadata function:', error);
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}