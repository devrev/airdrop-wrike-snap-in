import { AxiosInstance, AxiosResponse } from 'axios';
import { createMockAxiosInstance, createMockAxiosError } from './wrike-client.test.helpers';
import { testData as mockData, isAxiosResponse, createGetProjectsMock, createGetSpaceContactsMock } from './wrike-client.test.data';

/**
 * Extended mock data for Wrike API responses
 */
export const extendedMockData = {
  // Re-export the original mock data
  ...mockData,
  
  // Add extended mock data for specific test cases
  projects: {
    ...mockData.projects,
    emptyResponse: {
      status: 200,
      data: {
        kind: 'folders',
        data: []
      }
    },
    invalidResponse: {
      status: 200,
      data: {
        kind: 'unknown',
        data: null
      }
    }
  },
  spaces: {
    ...mockData.spaces,
    emptyMembers: {
      status: 200,
      data: {
        kind: 'spaces',
        data: [
          {
            id: 'space-1',
            title: 'Space 1',
            members: []
          }
        ]
      }
    },
    noMembers: {
      status: 200,
      data: {
        kind: 'spaces',
        data: [
          {
            id: 'space-1',
            title: 'Space 1'
            // No members field
          }
        ]
      }
    }
  }
};

// Re-export the original helpers for convenience
export { createMockAxiosInstance, createMockAxiosError };