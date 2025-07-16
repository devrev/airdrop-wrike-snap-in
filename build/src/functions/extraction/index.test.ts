// Mock the spawn function before importing any modules
const mockSpawn = jest.fn().mockResolvedValue(undefined);
jest.mock('@devrev/ts-adaas', () => {
  const actual = jest.requireActual('@devrev/ts-adaas');
  return { ...actual, spawn: mockSpawn };
});

// Import the test setup utilities
import { 
  setupMockSpawn, 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  createMockEvent, 
  verifySpawnCalls 
} from './test-setup';
import { run } from './index';
import { AirdropEvent } from '@devrev/ts-adaas';
import { EventType } from './test-utils';

describe('Extraction Function', () => {
  beforeEach(() => {
    // Set up test environment
    setupTestEnvironment(mockSpawn);
  });

  afterEach(() => {
    // Clean up test environment
    cleanupTestEnvironment();
    
    // Clear the mock between tests
    mockSpawn.mockClear();
  });

  it('should spawn a worker for ExtractionExternalSyncUnitsStart event type', async () => {
    // Test with the external sync units extraction event type
    const mockEvent = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction function successfully processed 1 external sync units events'
    });
    
    // Verify that spawn was called with the correct parameters
    verifySpawnCalls(mockSpawn, 1);
  });

  it('should not spawn a worker for other event types', async () => {
    // Test with a different event type
    const mockEvent = createMockEvent(EventType.ExtractionDataDelete);

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction function successfully processed 0 external sync units events'
    });
    
    // Verify that spawn was not called
    verifySpawnCalls(mockSpawn, 0);
  });

  it('should spawn a worker for ExtractionMetadataStart event type', async () => {
    // Test with the metadata extraction event type
    const mockEvent = createMockEvent(EventType.ExtractionMetadataStart);

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction function successfully processed 0 external sync units events'
    });
    
    // Verify that spawn was called with the correct parameters
    verifySpawnCalls(mockSpawn, 1, 'metadata-worker.ts');
  });

  it('should spawn a worker for ExtractionDataStart event type', async () => {
    // Test with the data extraction event type
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction function successfully processed 0 external sync units events'
    });
    
    // Verify that spawn was called with the correct parameters
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(mockSpawn.mock.calls[0][0]).toHaveProperty('initialDomainMapping');
    expect(mockSpawn.mock.calls[0][0]).toHaveProperty('workerPath');
    expect(mockSpawn.mock.calls[0][0].workerPath).toContain('data-worker.ts');
  });

  it('should handle multiple events correctly', async () => {
    // Create multiple events with different event types
    const event1 = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);
    const event2 = createMockEvent(EventType.ExtractionDataStart);
    const event3 = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);
    
    // Call the function with multiple events
    const result = await run([event1, event2, event3]);
    
    // Verify the result
    expect(result).toStrictEqual({
      status: 'success',
      message: 'Extraction function successfully processed 2 external sync units events'
    });
    
    // Verify that spawn was called twice (once for each ExtractionExternalSyncUnitsStart event)
    verifySpawnCalls(mockSpawn, 3);
  });

  it('should throw an error if events parameter is not an array', async () => {
    // Call the function with invalid input
    const invalidInput = null as unknown as AirdropEvent[];
    
    // Expect the function to throw an error
    await expect(run(invalidInput)).rejects.toThrow('Invalid input: events must be an array');
  });

  it('should throw an error if an event is missing required fields', async () => {
    // Create an invalid event missing context
    const invalidEvent = {
      payload: {},
      execution_metadata: {}
    } as unknown as AirdropEvent;
    
    // Expect the function to throw an error
    await expect(run([invalidEvent])).rejects.toThrow('missing required field \'context\'');
  });

  it('should handle empty events array', async () => {
    // Call the function with an empty array
    const result = await run([]);
    
    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Extraction function successfully processed 0 external sync units events'
    });
    
    // Verify that spawn was not called
    verifySpawnCalls(mockSpawn, 0);
  });
});