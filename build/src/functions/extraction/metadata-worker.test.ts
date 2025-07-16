// Mock the dependencies
jest.mock('@devrev/ts-adaas', () => {
  const ExtractorEventType = {
    ExtractionMetadataDone: 'EXTRACTION_METADATA_DONE',
    ExtractionMetadataError: 'EXTRACTION_METADATA_ERROR'
  };
  
  return {
    ExtractorEventType,
    processTask: jest.fn((params) => {
      // Store the task function for testing
      (global as any).taskFunction = params.task;
      (global as any).onTimeoutFunction = params.onTimeout;
    })
  };
});

// Mock the external domain metadata
jest.mock('../generate_metadata/external_domain_metadata.json', () => ({
  schema_version: 'v0.2.0',
  record_types: {
    tasks: { name: 'Task' },
    users: { name: 'User' }
  }
}));

// Import the worker file to trigger the processTask mock
import './metadata-worker';

describe('Metadata Extraction Worker', () => {
  // Mock adapter
  const mockPush = jest.fn().mockResolvedValue(true);
  const mockUpload = jest.fn().mockResolvedValue(undefined);
  const mockGetRepo = jest.fn().mockReturnValue({
    push: mockPush,
    upload: mockUpload
  });
  const mockInitializeRepos = jest.fn();
  const mockEmit = jest.fn().mockResolvedValue(undefined);
  
  const mockAdapter = {
    initializeRepos: mockInitializeRepos,
    getRepo: mockGetRepo,
    emit: mockEmit
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize repository and push metadata', async () => {
    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify repository initialization
    expect(mockInitializeRepos).toHaveBeenCalledWith([
      {
        itemType: 'external_domain_metadata'
      }
    ]);

    // Verify getRepo was called
    expect(mockGetRepo).toHaveBeenCalledWith('external_domain_metadata');

    // Verify push was called with the metadata
    expect(mockPush).toHaveBeenCalledWith([
      {
        schema_version: 'v0.2.0',
        record_types: {
          tasks: { name: 'Task' },
          users: { name: 'User' }
        }
      }
    ]);

    // Verify upload was called
    expect(mockUpload).toHaveBeenCalled();

    // Verify the emit call
    expect(mockEmit).toHaveBeenCalledWith('EXTRACTION_METADATA_DONE');
  });

  it('should emit an error event when repository initialization fails', async () => {
    // Mock getRepo to return null (initialization failed)
    mockGetRepo.mockReturnValueOnce(null);

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call with error
    expect(mockEmit).toHaveBeenCalledWith('EXTRACTION_METADATA_ERROR', {
      error: {
        message: 'Failed to initialize external_domain_metadata repository'
      }
    });
  });

  it('should emit an error event when push fails', async () => {
    // Mock push to throw an error
    mockPush.mockRejectedValueOnce(new Error('Push failed'));

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call with error
    expect(mockEmit).toHaveBeenCalledWith('EXTRACTION_METADATA_ERROR', {
      error: {
        message: 'Error during metadata upload: Push failed'
      }
    });
  });

  it('should emit an error event on timeout', async () => {
    // Execute the onTimeout function
    await (global as any).onTimeoutFunction({ adapter: mockAdapter });

    // Verify the emit call
    expect(mockEmit).toHaveBeenCalledWith('EXTRACTION_METADATA_ERROR', {
      error: {
        message: 'Metadata extraction timed out'
      }
    });
  });
});