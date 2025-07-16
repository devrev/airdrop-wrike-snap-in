// Mock axios before any imports
jest.mock('axios');

// Import the test utilities first
import { createMockEvent, EventType } from './test-utils';
import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';
import { run } from './index';

// Set up axios mock functions
const mockGet = jest.fn();
const mockPost = jest.fn();

// Properly mock axios methods
jest.spyOn(axios, 'get').mockImplementation(mockGet);
jest.spyOn(axios, 'post').mockImplementation(mockPost);

// Properly mock axios.isAxiosError with correct type handling
jest.spyOn(axios, 'isAxiosError').mockImplementation((error: any) => {
  return error && error.isAxiosError === true;
});

describe('Authentication Check Function', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock console.log and console.error to prevent test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console mocks
    jest.restoreAllMocks();
  });

  it('should return success when authentication is successful', async () => {
    // Mock successful axios response
    mockGet.mockResolvedValue({
      status: 200,
      data: { 
        data: [
          { id: 'user1', firstName: 'John', lastName: 'Doe' }
        ] 
      }
    });

    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify axios was called with correct parameters
    expect(axios.get).toHaveBeenCalledWith(
      'https://www.wrike.com/api/v4/contacts',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-api-key'
        },
        timeout: 10000
      })
    );

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Authentication check completed with status 200',
      auth_successful: true
    });
  });

  it('should return error when authentication fails with HTTP error', async () => {
    // Mock failed axios response
    mockGet.mockResolvedValue({
      status: 401,
      data: { error: 'Unauthorized' }
    });

    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication check completed with status 401',
      auth_successful: false,
      error: 'Received status code 401'
    });
  });

  it('should return error when axios throws an exception', async () => {
    // Mock axios throwing an error with response
    const axiosError = new Error('Request failed') as any;
    axiosError.isAxiosError = true;
    axiosError.response = { status: 401 };
    mockGet.mockRejectedValue(axiosError);
    
    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication check failed',
      auth_successful: false,
      error: expect.stringContaining('API request failed with status 401')
    });
  });

  it('should return error when axios throws a network exception', async () => {
    // Mock axios throwing a network error
    const networkError = new Error('Network error');
    mockGet.mockRejectedValue(networkError);

    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication check failed',
      auth_successful: false,
      error: 'Network error'
    });
  });

  it('should throw an error if events parameter is not an array', async () => {
    // Call the function with invalid input
    const invalidInput = null as unknown as AirdropEvent[];
    
    // Call the function
    const result = await run(invalidInput);
    
    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication check failed',
      auth_successful: false,
      error: 'Invalid input: events must be an array'
    });
  });

  it('should throw an error if events array is empty', async () => {
    // Call the function with empty array
    const result = await run([]);
    
    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication check failed',
      auth_successful: false,
      error: 'Invalid input: events array is empty'
    });
  });

  it('should throw an error if an event is missing required fields', async () => {
    // Create an invalid event missing context
    const invalidEvent = {
      payload: {},
      execution_metadata: {}
    } as unknown as AirdropEvent;
    
    // Call the function
    const result = await run([invalidEvent]);
    
    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication check failed',
      auth_successful: false,
      error: 'Invalid event: missing required field \'context\''
    });
  });

  it('should throw an error if API key is missing', async () => {
    // Create a mock event with missing API key
    const mockEvent: AirdropEvent = {
      ...createMockEvent(),
      payload: {
        ...createMockEvent().payload,
        connection_data: {
          ...createMockEvent().payload.connection_data,
          key: undefined as any // Use type assertion to allow undefined
        }
      }
    };

    // Call the function with the mock event
    const result = await run([mockEvent]);
    
    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication check failed',
      auth_successful: false,
      error: 'Invalid event: missing required field \'payload.connection_data.key\''
    });
  });
});