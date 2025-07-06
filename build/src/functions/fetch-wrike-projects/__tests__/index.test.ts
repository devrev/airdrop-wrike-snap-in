import { fetch_wrike_projects } from '../index';
import { WrikeClient } from '../../../core/wrike-client';

// Mock the WrikeClient class
jest.mock('../../../core/wrike-client');

describe('fetch_wrike_projects', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return success false when no events are provided', async () => {
    const result = await fetch_wrike_projects([]);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('No events provided');
  });

  it('should return success false when event payload is missing', async () => {
    const result = await fetch_wrike_projects([{}]);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Event payload or connection_data is missing');
  });

  it('should return success false when API key is missing', async () => {
    const event = {
      payload: {
        connection_data: {
          org_id: 'space-123'
        }
      }
    };
    
    const result = await fetch_wrike_projects([event]);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Wrike API key is missing in connection_data');
  });

  it('should return success false when space ID is missing', async () => {
    const event = {
      payload: {
        connection_data: {
          key: 'api-key-123'
        }
      }
    };
    
    const result = await fetch_wrike_projects([event]);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Space ID is missing in connection_data');
  });

  it('should return success true with projects when API call succeeds', async () => {
    // Mock implementation for successful API call
    const mockProjects = [
      { id: 'project-1', title: 'Project 1' },
      { id: 'project-2', title: 'Project 2' }
    ];
    
    (WrikeClient as jest.MockedClass<typeof WrikeClient>).mockImplementation(() => {
      return {
        getProjects: jest.fn().mockResolvedValue(mockProjects)
      } as unknown as WrikeClient;
    });
    
    const event = {
      payload: {
        connection_data: {
          key: 'api-key-123',
          org_id: 'space-123'
        }
      }
    };
    
    const result = await fetch_wrike_projects([event]);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully fetched');
    expect(result.projects).toEqual(mockProjects);
  });

  it('should return success false when API call fails with invalid space ID', async () => {
    // Mock implementation for API call with invalid space ID
    (WrikeClient as jest.MockedClass<typeof WrikeClient>).mockImplementation(() => {
      return {
        getProjects: jest.fn().mockRejectedValue(new Error('Resource not found'))
      } as unknown as WrikeClient;
    });
    
    const event = {
      payload: {
        connection_data: {
          key: 'api-key-123',
          org_id: 'invalid-space'
        }
      }
    };
    
    const result = await fetch_wrike_projects([event]);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid space ID');
  });

  it('should return success false when API call fails with other error', async () => {
    // Mock implementation for API call with other error
    (WrikeClient as jest.MockedClass<typeof WrikeClient>).mockImplementation(() => {
      return {
        getProjects: jest.fn().mockRejectedValue(new Error('Network error'))
      } as unknown as WrikeClient;
    });
    
    const event = {
      payload: {
        connection_data: {
          key: 'api-key-123',
          org_id: 'space-123'
        }
      }
    };
    
    const result = await fetch_wrike_projects([event]);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error fetching Wrike projects');
    expect(result.message).toContain('Network error');
  });
});