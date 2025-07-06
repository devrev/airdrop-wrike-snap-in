import { EventType, spawn } from '@devrev/ts-adaas';
import { readInitialDomainMapping } from '../../core/domain-mapping-utils';

/**
 * Helper function to assert successful extraction
 * 
 * @param result - The result from the extraction function
 * @param eventType - The event type that was processed
 * @param workerPath - The expected worker path
 */
export function assertSuccessfulExtraction(
  result: any, 
  eventType: EventType,
  workerPath: string
) {
  expect(result.success).toBe(true);
  expect(result.message).toContain('completed successfully');
  expect(spawn).toHaveBeenCalledWith(
    expect.objectContaining({
      event: expect.objectContaining({
        payload: expect.objectContaining({ 
          event_type: eventType
        })
      }),
      initialDomainMapping: expect.any(Object),
      workerPath: expect.stringContaining(workerPath)
    })
  );
}

/**
 * Helper function to assert failed extraction due to missing parameters
 * 
 * @param result - The result from the extraction function
 * @param expectedMessage - The expected error message
 */
export function assertFailedExtraction(
  result: any,
  expectedMessage: string
) {
  expect(result.success).toBe(false);
  expect(result.message).toContain(expectedMessage);
  expect(readInitialDomainMapping).not.toHaveBeenCalled();
  expect(spawn).not.toHaveBeenCalled();
}

/**
 * Helper function to assert failed extraction due to spawn error
 * 
 * @param result - The result from the extraction function
 * @param expectedMessage - The expected error message
 */
export function assertSpawnError(
  result: any,
  expectedMessage: string
) {
  expect(result.success).toBe(false);
  expect(result.message).toContain(expectedMessage);
  expect(result.details?.error).toContain('Spawn error');
  expect(readInitialDomainMapping).toHaveBeenCalled();
  expect(spawn).toHaveBeenCalled();
}