/**
 * Mock adapter for testing the data worker
 */
export const createMockAdapter = () => {
  // Mock adapter functions
  const mockPush = jest.fn().mockResolvedValue(true);
  const mockUpload = jest.fn().mockResolvedValue(undefined);
  const mockGetItems = jest.fn().mockReturnValue([]);
  const mockGetRepo = jest.fn().mockReturnValue({
    push: mockPush,
    upload: mockUpload,
    getItems: mockGetItems
  });
  const mockInitializeRepos = jest.fn();
  const mockEmit = jest.fn().mockResolvedValue(undefined);
  
  const mockAdapter = {
    event: {
      context: {},
      payload: {
        connection_data: {
          key: 'mock-api-key',
          org_id: 'mock-space-id'
        },
        event_context: {
          external_sync_unit_id: 'mock-project-id'
        }
      }
    },
    initializeRepos: mockInitializeRepos,
    getRepo: mockGetRepo,
    emit: mockEmit
  };

  return {
    mockAdapter,
    mockPush,
    mockUpload,
    mockGetItems,
    mockGetRepo,
    mockInitializeRepos,
    mockEmit
  };
};

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  // Mock space response with members
  spaceResponse: {
    status: 200,
    data: {
      data: [
        {
          id: 'mock-space-id',
          members: [
            { id: 'KUAFY3BJ' },
            { id: 'KUAFZBCJ' }
          ]
        }
      ]
    }
  },

  // Mock contacts response
  contactsResponse: {
    status: 200,
    data: {
      data: [
        {
          id: 'KUAFY3BJ',
          firstName: 'John',
          lastName: 'Doe',
          type: 'Person'
        },
        {
          id: 'KUAFZBCJ',
          firstName: 'Jane',
          lastName: 'Smith',
          type: 'Person'
        }
      ]
    }
  },

  // Mock tasks response
  tasksResponse: {
    status: 200,
    data: {
      data: [
        {
          id: 'task1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'Active',
          importance: 'Normal',
          createdDate: '2023-01-01T00:00:00Z',
          updatedDate: '2023-01-02T00:00:00Z',
          parentIds: ['mock-project-id']
        },
        {
          id: 'task2',
          title: 'Task 2',
          description: 'Description 2',
          status: 'Completed',
          importance: 'High',
          createdDate: '2023-02-01T00:00:00Z',
          updatedDate: '2023-02-02T00:00:00Z',
          parentIds: ['mock-project-id']
        }
      ]
    }
  }
};