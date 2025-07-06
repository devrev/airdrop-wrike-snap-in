import axios, { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Creates a mock Axios instance for testing
 * 
 * @returns A mocked Axios instance
 */
export function createMockAxiosInstance(): jest.Mocked<AxiosInstance> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    request: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    head: jest.fn(),
    defaults: {} as any,
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
    }
  } as unknown as jest.Mocked<AxiosInstance>;
}

/**
 * Creates a mock Axios error with the specified status code and data
 * 
 * @param status - HTTP status code
 * @param data - Response data
 * @param message - Error message
 * @returns A mocked Axios error
 */
export function createMockAxiosError(status: number, data: any = {}, message = 'API Error'): any {
  const mockError = new Error(message) as any;
  mockError.isAxiosError = true;
  mockError.response = {
    status,
    data: { error: data }
  };
  return mockError;
}

/**
 * Mock data for Wrike API responses
 */
export const mockData = {
  contacts: {
    success: {
      status: 200,
      data: {
        kind: 'contacts',
        data: [{ id: 'contact1' }, { id: 'contact2' }]
      }
    },
    unexpected: {
      status: 200,
      data: {
        kind: 'unknown',
        data: []
      }
    }
  },
  projects: {
    success: {
      status: 200,
      data: {
        kind: 'folders',
        data: [
          {
            id: 'project-1',
            title: 'Project 1',
            description: 'Description 1',
            createdDate: '2023-01-01T00:00:00Z',
            updatedDate: '2023-01-02T00:00:00Z',
            project: { status: 'Green' },
            ownerIds: ['user-1'],
            permalink: 'https://wrike.com/project-1',
            customFields: [{ id: 'field-1', value: 'value-1' }],
            childIds: ['task-1'],
            parentIds: ['folder-1'],
            scope: 'WsFolder'
          },
          {
            id: 'project-2',
            title: 'Project 2',
            createdDate: '2023-01-03T00:00:00Z',
            updatedDate: '2023-01-04T00:00:00Z',
            project: { status: 'Yellow' },
            permalink: 'https://wrike.com/project-2',
            scope: 'WsFolder'
          }
        ]
      }
    }
  },
  spaces: {
    success: {
      status: 200,
      data: {
        kind: 'spaces',
        data: [
          {
            id: 'space-1',
            title: 'Space 1',
            members: ['user-1', 'user-2']
          }
        ]
      }
    }
  },
  contactsData: {
    success: {
      status: 200,
      data: {
        kind: 'contacts',
        data: [
          { id: 'user-1', firstName: 'John', lastName: 'Doe', profiles: [{ email: 'john@example.com' }] },
          { id: 'user-2', firstName: 'Jane', lastName: 'Smith', profiles: [{ email: 'jane@example.com' }] }
        ]
      }
    }
  }
};

/**
 * Type guard to check if a response is an AxiosResponse
 */
export function isAxiosResponse(obj: any): obj is AxiosResponse {
  return obj && typeof obj === 'object' && 'status' in obj && 'data' in obj;
}