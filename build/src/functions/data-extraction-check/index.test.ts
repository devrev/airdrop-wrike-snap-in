import { EventType } from '@devrev/ts-adaas';

// Mock the domain-mapping-utils module
jest.mock('../../core/domain-mapping-utils', () => ({
  readInitialDomainMapping: jest.fn().mockReturnValue(
    { 
      format_version: 'v1', devrev_metadata_version: 1, additional_mappings: { record_type_mappings: {} } 
    }
  )
}));

// Mock the spawn function from the Airdrop SDK
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  spawn: jest.fn().mockImplementation(() => Promise.resolve())
}));

// Import after mocking to ensure we get the mocked version
import { spawn } from '@devrev/ts-adaas';
import { readInitialDomainMapping } from '../../core/domain-mapping-utils';
import { data_extraction_check } from './index';
 
describe('data_extraction_check function', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success when data extraction completes successfully', async () => {
    // Arrange - Set up test data
    const mockEvents = [{
      payload: {
        event_type: 'SOME_EVENT_TYPE' // Will be overridden in the function
      },
      context: {
        secrets: {
          service_account_token: 'mock-token'
        }
      }
    }];

    (spawn as jest.Mock).mockResolvedValueOnce(undefined);

    // Act
    const result = await data_extraction_check(mockEvents);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toContain('completed successfully');
    expect(spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          payload: expect.objectContaining({
            event_type: "EXTRACTION_DATA_START"
          })
        }),
        initialDomainMapping: expect.any(Object),
        initialState: expect.any(Object),
        workerPath: expect.stringContaining('worker.ts')
      })
    );
  }, 10000); // Increase timeout to 10 seconds


  it('should return false when no events are provided', async () => {
    // Arrange
    const mockEvents: any[] = [];
    
    // Act
    const result = await data_extraction_check(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('No events provided');
    expect(readInitialDomainMapping).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should return false when event payload is missing', async () => {
    // Arrange
    const mockEvents = [{ context: {} }];
    
    // Act
    const result = await data_extraction_check(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Event payload or event_type is missing');
    expect(readInitialDomainMapping).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should return false when authentication context is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        event_type: EventType.ExtractionDataStart
      },
      context: {}
    }];
    
    // Act
    const result = await data_extraction_check(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('missing required authentication context');
    expect(readInitialDomainMapping).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should return false when spawn throws an error', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        event_type: 'SOME_EVENT_TYPE'
      },
      context: {
        secrets: {
          service_account_token: 'mock-token'
        }
      }
    }];
    
    const mockError = new Error('Spawn error');
    (spawn as jest.Mock).mockRejectedValueOnce(mockError);
    
    // Act
    const result = await data_extraction_check(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to execute data extraction');
    expect(result.details?.error).toContain('Spawn error');
    expect(readInitialDomainMapping).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalled();
  }, 10000); // Increase timeout to 10 seconds

  it('should handle unexpected errors gracefully', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const mockError = new Error('Test error');
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw mockError;
    });
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Act
    const result = await data_extraction_check(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error testing data extraction');
    expect(readInitialDomainMapping).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in data_extraction_check function:', mockError);
  });
});