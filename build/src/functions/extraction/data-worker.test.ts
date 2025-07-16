// Mock the dependencies
jest.mock('./wrike-api-client', () => {
  return {
    WrikeApiClient: jest.fn().mockImplementation(() => ({
      fetchSpaceMembers: jest.fn(),
      fetchContacts: jest.fn(),
      fetchTasks: jest.fn()
    }))
  };
});

// Define ExtractorEventType at module level so it's accessible throughout the test file
const ExtractorEventType = {
  ExtractionDataDone: 'EXTRACTION_DATA_DONE',
  ExtractionDataError: 'EXTRACTION_DATA_ERROR'
};

jest.mock('@devrev/ts-adaas', () => {
  return {
    ExtractorEventType,
    processTask: jest.fn((params) => {
      // Store the task function for testing
      (global as any).taskFunction = params.task;
      (global as any).onTimeoutFunction = params.onTimeout;
    })
  };
});

// Mock axios
jest.mock('axios', () => ({ get: jest.fn() }));
import axios from 'axios';

// Import the mock data and adapter
import { createMockAdapter, mockApiResponses } from './data-worker-test-mocks';

// Import the worker file to trigger the processTask mock
import './data-worker';

// Import the WrikeApiClient
import { WrikeApiClient } from './wrike-api-client';

describe('Data Extraction Worker', () => {
  // Get mock adapter and functions
  const {
    mockAdapter,
    mockPush,
    mockUpload,
    mockGetItems,
    mockGetRepo,
    mockInitializeRepos,
    mockEmit
  } = createMockAdapter();

  // Mock WrikeApiClient instance
  const mockApiClient = new WrikeApiClient('mock-api-key');

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset mocks
    // Mock axios get method
    (axios.get as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch contacts and tasks and push them to repositories', async () => {
    // Mock API client responses
    (mockApiClient.fetchContacts as jest.Mock).mockResolvedValueOnce(mockApiResponses.contactsResponse.data.data);
    (mockApiClient.fetchTasks as jest.Mock).mockResolvedValueOnce(mockApiResponses.tasksResponse.data.data);
    (WrikeApiClient as jest.Mock).mockImplementation(() => mockApiClient);

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify repository initialization
    expect(mockInitializeRepos).toHaveBeenCalledWith([
      {
        itemType: 'users',
        normalize: expect.any(Function)
      },
      {
        itemType: 'tasks',
        normalize: expect.any(Function)
      }
    ]);

    // Verify getRepo was called for both repositories
    expect(mockGetRepo).toHaveBeenCalledWith('users');
    expect(mockGetRepo).toHaveBeenCalledWith('tasks');

    // Verify push was called for both repositories
    expect(mockPush).toHaveBeenCalledTimes(2);
    
    // Verify upload was called for both repositories
    expect(mockUpload).toHaveBeenCalledTimes(2);

    // Verify the emit call
    expect(mockEmit).toHaveBeenCalledWith('EXTRACTION_DATA_DONE');
  });

  it('should emit an error event when space API call fails', async () => {
    // Mock API client to throw an error
    (mockApiClient.fetchContacts as jest.Mock).mockRejectedValueOnce(new Error('API error'));
    (WrikeApiClient as jest.Mock).mockImplementation(() => mockApiClient);

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call with error
    expect(mockEmit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Error fetching contacts: API error'
      }
    });
  });

  it('should emit an error event when contacts API call fails', async () => {
    // Mock API client to throw an error on contacts
    (mockApiClient.fetchContacts as jest.Mock).mockRejectedValueOnce(new Error('Contacts API error'));
    (WrikeApiClient as jest.Mock).mockImplementation(() => mockApiClient);

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call with error
    expect(mockEmit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Error fetching contacts: Contacts API error'
      }
    });
  });

  it('should emit an error event when tasks API call fails', async () => {
    // Mock API client to succeed on contacts but fail on tasks
    (mockApiClient.fetchContacts as jest.Mock).mockResolvedValueOnce(mockApiResponses.contactsResponse.data.data);
    (mockApiClient.fetchTasks as jest.Mock).mockRejectedValueOnce(new Error('Tasks API error'));
    (WrikeApiClient as jest.Mock).mockImplementation(() => mockApiClient);

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call with error
    expect(mockEmit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Error fetching tasks: Tasks API error'
      }
    });
  });

  it('should emit an error event when repository push fails', async () => {
    // Mock API client to succeed
    (mockApiClient.fetchContacts as jest.Mock).mockResolvedValueOnce(mockApiResponses.contactsResponse.data.data);
    (WrikeApiClient as jest.Mock).mockImplementation(() => mockApiClient);

    // Mock push to fail
    mockPush.mockRejectedValueOnce(new Error('Push failed'));

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call with error
    expect(mockEmit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Error pushing contacts: Push failed'
      }
    });
  });

  it('should emit an error event on timeout', async () => {
    // Execute the onTimeout function
    await (global as any).onTimeoutFunction({ adapter: mockAdapter });

    // Verify the emit call
    expect(mockEmit).toHaveBeenCalledWith('EXTRACTION_DATA_ERROR', {
      error: {
        message: 'Data extraction timed out'
      }
    });
  });
});