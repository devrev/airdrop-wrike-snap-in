// Mock the dependencies before importing them
jest.mock('axios');

// Import the test utilities
import { createMockEvent, EventType } from './test-utils';
import { run } from './index';
import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

// Mock @devrev/ts-adaas to use our mock EventType
jest.mock('@devrev/ts-adaas', () => ({
  EventType: require('./test-utils').EventType
}));

describe('Data Push Check Function', () => {
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

  it('should return success when data push is successful', async () => {
    // Mock successful axios response
    (axios.post as jest.Mock).mockResolvedValue({
      status: 200,
      data: { success: true }
    });

    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify axios was called with correct parameters
    expect(axios.post).toHaveBeenCalledWith(
      'https://mock-callback-url.com',
      expect.objectContaining({
        test_data: 'This is a test payload',
        timestamp: expect.any(String),
        snap_in_version_id: 'mock-version-id'
      }),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'mock-token'
        },
        timeout: 10000
      })
    );

    // Verify the result
    expect(result).toEqual({
      status: 'success',
      message: 'Data push check function completed with status 200',
      push_successful: true
    });
  });

  it('should return error when data push fails with HTTP error', async () => {
    // Mock failed axios response
    (axios.post as jest.Mock).mockResolvedValue({
      status: 403,
      data: { error: 'Forbidden' }
    });

    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Data push check function completed with status 403',
      push_successful: false,
      error: 'Received status code 403'
    });
  });

  it('should return error when axios throws an exception', async () => {
    // Mock axios throwing an error
    (axios.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    // Create a mock event
    const mockEvent = createMockEvent();

    // Call the function with the mock event
    const result = await run([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Data push check function failed',
      push_successful: false,
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
      message: 'Data push check function failed',
      push_successful: false,
      error: 'Invalid input: events must be an array'
    });
  });

  it('should throw an error if events array is empty', async () => {
    // Call the function with empty array
    const result = await run([]);
    
    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Data push check function failed',
      push_successful: false,
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
      message: 'Data push check function failed',
      push_successful: false,
      error: 'Invalid event: missing required field \'context\''
    });
  });

  it('should throw an error if callback_url is missing', async () => {
    // Create a mock event with missing callback_url
    const mockEvent: AirdropEvent = {
      ...createMockEvent(),
      payload: {
        ...createMockEvent().payload,
        event_context: {
          ...createMockEvent().payload.event_context,
          callback_url: undefined as any // Use type assertion to allow undefined
        }
      }
    };

    // Call the function with the mock event
    const result = await run([mockEvent]);
    
    // Verify the result
    expect(result).toEqual({
      status: 'error',
      message: 'Data push check function failed',
      push_successful: false,
      error: 'Invalid event: missing required field \'payload.event_context.callback_url\''
    });
  });
});