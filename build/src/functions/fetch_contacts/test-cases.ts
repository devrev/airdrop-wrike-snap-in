import { AirdropEvent } from '@devrev/ts-adaas';
import { createMockEvent } from './test-utils';
import { mockResponses, expectedResults, createAxiosError } from './test-data';

export interface TestCase {
  name: string;
  setup: (mockGet: jest.Mock) => void;
  input: AirdropEvent[];
  expectedResult: any;
}

export const testCases: TestCase[] = [
  {
    name: 'should return contacts when API calls are successful',
    setup: (mockGet) => {
      // First call to get space members
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.successfulSpaceResponse));
      
      // Second call to get contact details
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.successfulContactsResponse));
    },
    input: [createMockEvent()],
    expectedResult: expectedResults.successfulFetch
  },
  {
    name: 'should return empty contacts array when space has no members',
    setup: (mockGet) => {
      // Return space with no members
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.emptySpaceResponse));
    },
    input: [createMockEvent()],
    expectedResult: expectedResults.emptySpace
  },
  {
    name: 'should return error when first API call returns non-200 status',
    setup: (mockGet) => {
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.errorResponses.forbidden));
    },
    input: [createMockEvent()],
    expectedResult: expectedResults.errors.spaceMembers
  },
  {
    name: 'should return error when second API call returns non-200 status',
    setup: (mockGet) => {
      // First call to get space members succeeds
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.successfulSpaceResponse));
      
      // Second call to get contact details fails
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.errorResponses.forbidden));
    },
    input: [createMockEvent()],
    expectedResult: expectedResults.errors.contactDetails
  },
  {
    name: 'should return error when first API response format is invalid',
    setup: (mockGet) => {
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.errorResponses.invalidFormat));
    },
    input: [createMockEvent()],
    expectedResult: expectedResults.errors.invalidSpaceFormat
  },
  {
    name: 'should return error when second API response format is invalid',
    setup: (mockGet) => {
      // First call to get space members succeeds
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.successfulSpaceResponse));
      
      // Second call returns invalid format
      mockGet.mockImplementationOnce(() => Promise.resolve(mockResponses.errorResponses.invalidFormat));
    },
    input: [createMockEvent()],
    expectedResult: expectedResults.errors.invalidContactsFormat
  },
  {
    name: 'should return error when axios throws an exception on first call',
    setup: (mockGet) => {
      // Create a proper Axios error
      mockGet.mockRejectedValueOnce(createAxiosError(401));
    },
    input: [createMockEvent()],
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch contacts from Wrike API',
      error: expect.stringContaining('API request failed with status 401')
    }
  },
  {
    name: 'should return error when axios throws a network exception',
    setup: (mockGet) => {
      const networkError = new Error('Network error');
      mockGet.mockRejectedValueOnce(networkError);
    },
    input: [createMockEvent()],
    expectedResult: expectedResults.errors.networkError
  },
  {
    name: 'should throw an error if events parameter is not an array',
    setup: () => {},
    input: null as unknown as AirdropEvent[], // Use null to test non-array input
    expectedResult: expectedResults.errors.invalidInput
  },
  {
    name: 'should throw an error if events array is empty',
    setup: () => {},
    input: [],
    expectedResult: expectedResults.errors.emptyEvents
  },
  {
    name: 'should throw an error if an event is missing required fields',
    setup: () => {},
    input: [{
      payload: {},
      execution_metadata: {}
    } as unknown as AirdropEvent],
    expectedResult: expectedResults.errors.missingContext
  },
  {
    name: 'should throw an error if API key is missing',
    setup: () => {},
    input: [{
      ...createMockEvent(),
      payload: {
        ...createMockEvent().payload,
        connection_data: {
          ...createMockEvent().payload.connection_data,
          key: undefined as any
        }
      }
    }],
    expectedResult: expectedResults.errors.missingApiKey
  },
  {
    name: 'should throw an error if Space ID is missing',
    setup: () => {},
    input: [{
      ...createMockEvent(),
      payload: {
        ...createMockEvent().payload,
        connection_data: {
          ...createMockEvent().payload.connection_data,
          org_id: undefined as any
        }
      }
    }],
    expectedResult: expectedResults.errors.missingSpaceId
  }
];