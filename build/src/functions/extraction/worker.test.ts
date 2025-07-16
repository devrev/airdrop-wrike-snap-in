// Mock axios before importing anything else
jest.mock('axios', () => ({
  get: jest.fn(),
  isAxiosError: jest.fn()
}));

// Import axios after mocking
import axios from 'axios';

// Mock the ExtractorEventType enum
const ExtractorEventType = {
  ExtractionExternalSyncUnitsDone: 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE',
  ExtractionExternalSyncUnitsError: 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR'
};

const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock the adapter
const mockEmit = jest.fn().mockResolvedValue(undefined);
const mockAdapter = {
  event: {
    payload: {
      connection_data: {
        key: 'mock-api-key',
        org_id: 'mock-space-id'
      }
    }
  },
  emit: mockEmit
};

// Mock processTask to capture the task function
jest.mock('@devrev/ts-adaas', () => ({
  ExtractorEventType,
  processTask: jest.fn((params) => {
    // Store the task function for testing
    (global as any).taskFunction = params.task;
    (global as any).onTimeoutFunction = params.onTimeout;
  })
}));

// Import the worker file to trigger the processTask mock
import './worker';

describe('Extraction Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch projects and their task counts and emit them as external sync units', async () => {
    // Mock the first API call to get projects
    mockAxios.get.mockImplementationOnce(() => Promise.resolve({
      status: 200,
      data: {
        data: [
          {
            id: 'project1',
            title: 'Project 1',
            description: 'Description 1'
          },
          {
            id: 'project2',
            title: 'Project 2',
            description: 'Description 2'
          }
        ]
      }
    }));

    // Mock the API calls to get task counts for each project
    mockAxios.get.mockImplementationOnce(() => Promise.resolve({
      status: 200,
      data: {
        data: [
          { id: 'task1' },
          { id: 'task2' },
          { id: 'task3' }
        ]
      }
    }));

    mockAxios.get.mockImplementationOnce(() => Promise.resolve({
      status: 200,
      data: {
        data: [
          { id: 'task4' },
          { id: 'task5' }
        ]
      }
    }));

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify API calls
    expect(mockAxios.get).toHaveBeenCalledTimes(3);
    expect(mockAxios.get).toHaveBeenNthCalledWith(
      1,
      'https://www.wrike.com/api/v4/spaces/mock-space-id/folders',
      expect.objectContaining({
        headers: { 'Authorization': 'Bearer mock-api-key' },
        params: { descendants: true }
      })
    );
    expect(mockAxios.get).toHaveBeenNthCalledWith(
      2,
      'https://www.wrike.com/api/v4/folders/project1/tasks',
      expect.objectContaining({
        headers: { 'Authorization': 'Bearer mock-api-key' },
        params: { descendants: true, subTasks: true }
      })
    );
    expect(mockAxios.get).toHaveBeenNthCalledWith(
      3,
      'https://www.wrike.com/api/v4/folders/project2/tasks',
      expect.objectContaining({
        headers: { 'Authorization': 'Bearer mock-api-key' },
        params: { descendants: true, subTasks: true }
      })
    );

    // Verify the emit call
    expect(mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsDone,
      {
        external_sync_units: [
          {
            id: 'project1',
            name: 'Project 1',
            description: 'Description 1',
            item_count: 3,
            item_type: 'tasks'
          },
          {
            id: 'project2',
            name: 'Project 2',
            description: 'Description 2',
            item_count: 2,
            item_type: 'tasks'
          }
        ]
      }
    );
  });

  it('should handle errors when fetching task counts', async () => {
    // Mock the first API call to get projects
    mockAxios.get.mockImplementationOnce(() => Promise.resolve({
      status: 200,
      data: {
        data: [
          {
            id: 'project1',
            title: 'Project 1',
            description: 'Description 1'
          },
          {
            id: 'project2',
            title: 'Project 2',
            description: 'Description 2'
          }
        ]
      }
    }));

    // Mock the first task count API call to succeed
    mockAxios.get.mockImplementationOnce(() => Promise.resolve({
      status: 200,
      data: {
        data: [
          { id: 'task1' },
          { id: 'task2' }
        ]
      }
    }));

    // Mock the second task count API call to fail
    mockAxios.get.mockImplementationOnce(() => Promise.reject(new Error('API error')));

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call - should still include both projects
    expect(mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsDone,
      {
        external_sync_units: [
          {
            id: 'project1',
            name: 'Project 1',
            description: 'Description 1',
            item_count: 2,
            item_type: 'tasks'
          },
          {
            id: 'project2',
            name: 'Project 2',
            description: 'Description 2',
            item_count: 0, // Failed to get task count
            item_type: 'tasks'
          }
        ]
      }
    );
  });

  it('should emit an error event when the projects API call fails', async () => {
    // Mock the API call to fail
    mockAxios.get.mockImplementationOnce(() => Promise.reject(new Error('API error')));

    // Execute the task function
    await (global as any).taskFunction({ adapter: mockAdapter });

    // Verify the emit call
    expect(mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsError,
      {
        error: {
          message: 'API error'
        }
      }
    );
  });

  it('should emit an error event on timeout', async () => {
    // Execute the onTimeout function
    await (global as any).onTimeoutFunction({ adapter: mockAdapter });

    // Verify the emit call
    expect(mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsError,
      {
        error: {
          message: 'External sync units extraction timed out'
        }
      }
    );
  });
});