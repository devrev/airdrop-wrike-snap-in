import { WrikeClient } from '../../core/wrike-client';
import { check_wrike_auth } from './index';

// Mock the WrikeClient class
jest.mock('../../core/wrike-client');

// Type assertion to help TypeScript understand our mocks
const MockedWrikeClient = WrikeClient as jest.MockedClass<typeof WrikeClient>;

// Create a spy for the testAuthentication method
describe('check_wrike_auth function', () => {
  // Reset mocks before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset the mock implementation for WrikeClient
    MockedWrikeClient.mockClear();
  });

  it('should return authenticated: true when authentication is successful', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'valid-api-key'
        }
      }
    }];

    // Set up the mock implementation for testAuthentication
    MockedWrikeClient.prototype.testAuthentication.mockResolvedValueOnce({
      success: true,
      message: 'Successfully authenticated with Wrike API',
      details: {
        contacts_count: 5
      }
    });
    
    // Act
    const result = await check_wrike_auth(mockEvents);
    
    // Assert
    expect(result.authenticated).toBe(true);
    expect(result.message).toContain('Successfully authenticated');
    expect(result.details?.contacts_count).toBe(5);
    expect(MockedWrikeClient).toHaveBeenCalledWith('valid-api-key');
  });

  it('should return authenticated: false when no events are provided', async () => {
    // Arrange
    const mockEvents: any[] = [];
    
    // Act
    const result = await check_wrike_auth(mockEvents);
    
    // Assert
    expect(result.authenticated).toBe(false);
    expect(result.message).toContain('No events provided');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return authenticated: false when event payload is missing', async () => {
    // Arrange
    const mockEvents = [{ context: {} }];
    
    // Act
    const result = await check_wrike_auth(mockEvents);
    
    // Assert
    expect(result.authenticated).toBe(false);
    expect(result.message).toContain('Event payload or connection_data is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return authenticated: false when API key is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {}
      }
    }];
    
    // Act
    const result = await check_wrike_auth(mockEvents);
    
    // Assert
    expect(result.authenticated).toBe(false);
    expect(result.message).toContain('Wrike API key is missing');
    expect(MockedWrikeClient).not.toHaveBeenCalled();
  });

  it('should return authenticated: false when authentication fails', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        connection_data: {
          key: 'invalid-api-key'
        }
      }
    }];
    
    // Set up the mock implementation for testAuthentication
    MockedWrikeClient.prototype.testAuthentication.mockResolvedValueOnce({
      success: false,
      message: 'Authentication failed: Invalid API key',
      details: {
        error: 'Unauthorized'
      }
    });
    
    // Act
    const result = await check_wrike_auth(mockEvents);
    
    // Assert
    expect(result.authenticated).toBe(false);
    expect(result.message).toContain('Authentication failed');
    expect(result.details?.error).toBe('Unauthorized');
    expect(MockedWrikeClient).toHaveBeenCalledWith('invalid-api-key');
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
    const result = await check_wrike_auth(mockEvents);
    
    // Assert
    expect(result.authenticated).toBe(false);
    expect(result.message).toContain('Error checking Wrike authentication');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in check_wrike_auth function:', mockError);
  });
});