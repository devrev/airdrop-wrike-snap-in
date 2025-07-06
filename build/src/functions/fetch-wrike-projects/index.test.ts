import { WrikeClient } from '../../core/wrike-client';
import { fetch_wrike_projects } from './index';

// Mock the WrikeClient class
jest.mock('../../core/wrike-client');

// Type assertion to help TypeScript understand our mocks
const MockedWrikeClient = WrikeClient as jest.MockedClass<typeof WrikeClient>;

describe('fetch_wrike_projects function', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    MockedWrikeClient.mockClear();
  });

  it('should return projects when API call is successful', async () => {
    // Arrange
    const mockProjects = [
      { id: 'project1', title: 'Project 1', description: 'Description 1' },
      { id: 'project2', title: 'Project 2', description: 'Description 2' }
    ];
    
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key',
          org_id: 'space-id'
        }
      }
    }];

    // Set up the mock implementation for getProjects
    MockedWrikeClient.prototype.getProjects.mockResolvedValueOnce(mockProjects);
    
    // Act
    const result = await fetch_wrike_projects(mockEvents);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully fetched 2 projects');
    expect(result.projects).toEqual(mockProjects);
    expect(MockedWrikeClient).toHaveBeenCalledWith('valid-api-key');
    expect(MockedWrikeClient.prototype.getProjects).toHaveBeenCalledWith('space-id');
  });

  it('should return false when no events are provided', async () => {
    // Arrange
    const mockEvents: any[] = [];
    
    // Act
    const result = await fetch_wrike_projects(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('No events provided');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when event payload is missing', async () => {
    // Arrange
    const mockEvents = [{ context: {} }];
    
    // Act
    const result = await fetch_wrike_projects(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Event payload or connection_data is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when API key is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          org_id: 'space-id'
        }
      }
    }];
    
    // Act
    const result = await fetch_wrike_projects(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Wrike API key is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when Space ID is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key'
        }
      }
    }];
    
    // Act
    const result = await fetch_wrike_projects(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Space ID is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return false when API call fails', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key',
          org_id: 'space-id'
        }
      }
    }];
    
    const mockError = new Error('API Error');
    MockedWrikeClient.prototype.getProjects.mockRejectedValueOnce(mockError);
    
    // Act
    const result = await fetch_wrike_projects(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error fetching Wrike projects');
    expect(result.details?.error).toContain('API Error');
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
    const result = await fetch_wrike_projects(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error fetching Wrike projects');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in fetch_wrike_projects function:', mockError);
  });
});