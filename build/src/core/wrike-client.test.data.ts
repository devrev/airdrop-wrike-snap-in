import { AxiosResponse } from 'axios';

/**
 * Mock data for Wrike API responses
 */
export const testData = {
  contacts: {
    success: {
      status: 200,
      data: {
        kind: 'contacts',
        data: [
          { id: 'contact-1', firstName: 'John', lastName: 'Doe', profiles: [{ email: 'john@example.com' }] },
          { id: 'contact-2', firstName: 'Jane', lastName: 'Smith', profiles: [{ email: 'jane@example.com' }] }
        ]
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
    },
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
    },
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

/**
 * Creates a mock implementation for the WrikeClient's getProjects method
 * 
 * @param mockResponse - The mock response to return
 * @returns A mock implementation function
 */
export function createGetProjectsMock(mockResponse: any) {
  return jest.fn().mockImplementation((spaceId: string) => {
    if (!spaceId) {
      return Promise.reject(new Error('Space ID is required'));
    }
    
    if (isAxiosResponse(mockResponse)) {
      return Promise.resolve(mockResponse.data.data.map((project: any) => ({
        id: project.id,
        title: project.title,
        description: project.description || '',
        created_date: project.createdDate,
        updated_date: project.updatedDate,
        status: project.project?.status || 'Unknown',
        owner_ids: project.ownerIds || [],
        permalink: project.permalink,
        custom_fields: project.customFields || [],
        child_ids: project.childIds || [],
        parent_ids: project.parentIds || [],
        scope: project.scope,
        project_data: project.project || {}
      })));
    }
    
    return Promise.resolve(mockResponse);
  });
}

/**
 * Creates a mock implementation for the WrikeClient's getSpaceContacts method
 * 
 * @param mockSpaceResponse - The mock response for the space request
 * @param mockContactsResponse - The mock response for the contacts request
 * @returns A mock implementation function
 */
export function createGetSpaceContactsMock(mockSpaceResponse: any, mockContactsResponse?: any) {
  return jest.fn().mockImplementation((spaceId: string) => {
    if (!spaceId) {
      return Promise.reject(new Error('Space ID is required'));
    }
    
    if (isAxiosResponse(mockSpaceResponse)) {
      const space = mockSpaceResponse.data.data[0];
      if (!space || !space.members || !Array.isArray(space.members) || space.members.length === 0) {
        return Promise.resolve([]);
      }
      
      if (mockContactsResponse && isAxiosResponse(mockContactsResponse)) {
        return Promise.resolve(mockContactsResponse.data.data.map((contact: any) => ({
          id: contact.id,
          first_name: contact.firstName || '',
          last_name: contact.lastName || '',
          full_name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          email: contact.profiles?.[0]?.email || '',
          timezone: contact.timezone || '',
          locale: contact.locale || '',
          deleted: contact.deleted || false,
          avatar_url: contact.avatarUrl || '',
          role: contact.role || ''
        })));
      }
      
      return Promise.resolve([]);
    }
    
    return Promise.resolve(mockSpaceResponse);
  });
}