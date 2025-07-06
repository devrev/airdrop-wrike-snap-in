import axios from 'axios';
import { canPushData } from './index';

// Mock axios module
jest.mock('axios');

// Type assertion to help TypeScript understand our mocks
const mockedAxios = axios as jest.Mocked<typeof axios>;
describe('canPushData function', () => {
  let postSpy: jest.SpyInstance;
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

  });

  beforeAll(() => {
    postSpy = jest.spyOn(axios, 'post');
  });

  it('should return success when data push works', async () => {
    // Arrange
    const callbackUrl = 'https://example.com/callback';
    const mockEvents = [{
      payload: {
        event_context: {
          callback_url: callbackUrl
        }
      }
    }];

    postSpy.mockResolvedValueOnce({
      status: 200,
      data: { success: true }
    });

    // Act 
    const result = await canPushData(mockEvents);
    
    // Assert
    expect(result.can_push).toBe(true);
    expect(result.message).toContain('Successfully pushed data');
    expect(postSpy).toHaveBeenCalledWith(
      callbackUrl,
      expect.objectContaining({
        test_data: true,
        timestamp: expect.any(String),
        message: expect.any(String)
      }),
      expect.any(Object)
    ); 
  });

  it('should return false when no events are provided', async () => {
    // Arrange 
    const mockEvents: any[] = [];

    // Act
    const result = await canPushData(mockEvents); 
    
    // Assert
    expect(result.can_push).toBe(false);
    expect(result.message).toContain('No events provided'); 
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('should return false when callback_url is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        event_context: {}
      }
    }];
    
    // Act
    const result = await canPushData(mockEvents);
    
    // Assert
    expect(result.can_push).toBe(false);
    expect(result.message).toContain('callback_url is missing');
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('should return false when HTTP request fails', async () => {
    // Arrange
    const callbackUrl = 'https://example.com/callback';
    const mockEvents = [{
      payload: {
        event_context: {
          callback_url: callbackUrl
        }
      }
    }];
    
    const axiosError = new Error('Network Error') as any;
    axiosError.isAxiosError = true;
    axiosError.code = 'ECONNREFUSED';    
    postSpy.mockRejectedValueOnce(axiosError);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    
    // Act
    const result = await canPushData(mockEvents);
    
    // Assert
    expect(result.can_push).toBe(false);
    expect(result.message).toContain('Failed to push data');
    expect(result.details?.error_code).toBe('ECONNREFUSED');
  });

  it('should return false when server returns non-success status code', async () => {
    // Arrange
    const callbackUrl = 'https://example.com/callback';
    const mockEvents = [{
      payload: {
        event_context: {
          callback_url: callbackUrl
        }
      }
    }];

    postSpy.mockResolvedValueOnce({
      status: 400,
      data: { error: 'Bad Request' } 
    });
    
    // Act
    const result = await canPushData(mockEvents);
    
    // Assert
    expect(result.can_push).toBe(false);
    expect(result.message).toContain('Received non-success status code');
    expect(result.details?.status_code).toBe(400);
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
    const result = await canPushData(mockEvents);
    
    // Assert
    expect(result.can_push).toBe(false);
    expect(result.message).toContain('Error validating data push');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in canPushData function:', mockError);
  });
});