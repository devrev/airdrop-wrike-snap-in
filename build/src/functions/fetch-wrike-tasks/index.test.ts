import { WrikeClient } from '../../core/wrike-client';
import { fetch_wrike_tasks } from './index';

// Mock the WrikeClient class
jest.mock('../../core/wrike-client');

// Type assertion to help TypeScript understand our mocks
const MockedWrikeClient = WrikeClient as jest.MockedClass<typeof WrikeClient>;

describe('fetch_wrike_tasks function', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    MockedWrikeClient.mockClear();
  });

  it('should return tasks when API call is successful', async () => {
    // Arrange
    const mockTasks = [
      { id: 'task1', title: 'Task 1', description: 'Description 1', status: 'Active' },
      { id: 'task2', title: 'Task 2', description: 'Description 2', status: 'Completed' }
    ];
    
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key'
        },
        event_context: {
          external_sync_unit_id: 'project-id'
        }
      }
    }];

    // Set up the mock implementation for getProjectTasks
    MockedWrikeClient.prototype.getProjectTasks.mockResolvedValueOnce(mockTasks);
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully fetched 2 tasks');
    expect(result.tasks).toEqual(mockTasks);
    expect(MockedWrikeClient).toHaveBeenCalledWith('valid-api-key');
    expect(MockedWrikeClient.prototype.getProjectTasks).toHaveBeenCalledWith('project-id');
  });

  it('should return false when no events are provided', async () => {
    // Arrange
    const mockEvents: any[] = [];
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('No events provided');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when event payload is missing', async () => {
    // Arrange
    const mockEvents = [{ context: {} }];
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Event payload or connection_data is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when event_context is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key'
        }
      }
    }];
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Event context or external_sync_unit_id is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when API key is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {},
        event_context: {
          external_sync_unit_id: 'project-id'
        }
      }
    }];
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Wrike API key is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when Project ID is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key'
        },
        event_context: {
          external_sync_unit_id: ''
        }
      }
    }];
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Project ID is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when API call fails', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key'
        },
        event_context: {
          external_sync_unit_id: 'project-id'
        }
      }
    }];
    
    const mockError = new Error('API Error');
    MockedWrikeClient.prototype.getProjectTasks.mockRejectedValueOnce(mockError);
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error fetching Wrike tasks');
    expect(result.details?.error).toContain('API Error');
    expect(MockedWrikeClient).toHaveBeenCalledWith('valid-api-key');
  });

  it('should handle resource not found errors gracefully', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key'
        },
        event_context: {
          external_sync_unit_id: 'invalid-project-id'
        }
      }
    }];
    
    const mockError = new Error('Resource not found');
    MockedWrikeClient.prototype.getProjectTasks.mockRejectedValueOnce(mockError);
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid project ID');
    expect(MockedWrikeClient).toHaveBeenCalledWith('valid-api-key');
  });

  it('should handle unexpected errors gracefully', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const mockError = new Error('Test error');
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw mockError;
    });
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Act
    const result = await fetch_wrike_tasks(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error fetching Wrike tasks');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in fetch_wrike_tasks function:', mockError);
  });
});