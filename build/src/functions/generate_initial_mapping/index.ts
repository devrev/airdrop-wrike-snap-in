import { AirdropEvent } from '@devrev/ts-adaas';
import initialDomainMapping from './initial_domain_mapping.json';

/**
 * A function that generates and returns the Initial Domain Mapping JSON object.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns The Initial Domain Mapping JSON object
 */
export async function run(events: AirdropEvent[]): Promise<{ 
  status: string, 
  message: string, 
  mapping: any
}> {
  try {
    // Validate input parameters
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    // Log the event for debugging purposes
    console.log('Generate initial mapping function invoked');
    
    // Return the Initial Domain Mapping
    return {
      status: 'success',
      message: 'Successfully generated Initial Domain Mapping',
      mapping: initialDomainMapping
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in generate initial mapping function:', error);
    
    // Re-throw the error to be handled by the caller
    throw error;
  }
}