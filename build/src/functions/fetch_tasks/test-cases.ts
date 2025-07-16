import { AirdropEvent } from '@devrev/ts-adaas';
import { createMockEvent, mockWrikeTasksResponse } from './test-utils';

export interface TestCase {
  name: string;
  setup: (mockGet: jest.Mock) => void;
  input: AirdropEvent[];
  expectedResult: any;
}

export const testCases: TestCase[] = [
  {
    name: 'should return tasks when API call is successful',
    setup: (mockGet) => {
      mockGet.mockResolvedValue({
        status: 200,
        data: mockWrikeTasksResponse
      });
    },
    input: [createMockEvent()],
    expectedResult: {
      status: 'success',
      message: 'Successfully fetched 2 tasks from project IEACW7SVI4OMYFIY',
      tasks: [
        {
          id: 'IEACW7SVKQZEBEUN',
          title: 'Task 1',
          description: 'This is task 1',
          status: 'Active',
          importance: 'Normal',
          created_date: '2023-01-01T00:00:00Z',
          updated_date: '2023-01-02T00:00:00Z',
          completed_date: null,
          due_date: '2023-01-10T00:00:00Z',
          parent_ids: ['IEACW7SVI4OMYFIY'],
          responsible_ids: ['KUAFY3BJ'],
          author_ids: ['KUAFZBCJ'],
          custom_status_id: 'ABCD1234',
          permalink: 'https://www.wrike.com/open.htm?id=123456789'
        },
        {
          id: 'IEACW7SVKQPX4WHN',
          title: 'Task 2',
          description: 'This is task 2',
          status: 'Completed',
          importance: 'High',
          created_date: '2023-02-01T00:00:00Z',
          updated_date: '2023-02-02T00:00:00Z',
          completed_date: '2023-02-05T00:00:00Z',
          due_date: '2023-02-10T00:00:00Z',
          parent_ids: ['IEACW7SVI4OMYFIY'],
          responsible_ids: ['KUAFY3BJ'],
          author_ids: ['KUAFZBCJ'],
          custom_status_id: 'EFGH5678',
          permalink: 'https://www.wrike.com/open.htm?id=987654321'
        }
      ]
    }
  },
  {
    name: 'should return error when API call returns non-200 status',
    setup: (mockGet) => {
      mockGet.mockResolvedValue({
        status: 403,
        data: { error: 'Forbidden' }
      });
    },
    input: [createMockEvent()],
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks with status 403',
      error: 'Received status code 403'
    }
  },
  {
    name: 'should return error when API response format is invalid',
    setup: (mockGet) => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { invalid: 'format' }
      });
    },
    input: [createMockEvent()],
    expectedResult: {
      status: 'error',
      message: 'Invalid response format from Wrike API',
      error: 'Response data is not in the expected format'
    }
  },
  {
    name: 'should return error when axios throws an exception',
    setup: (mockGet) => {
      const axiosError = new Error('Request failed') as any;
      axiosError.isAxiosError = true;
      axiosError.response = { status: 401 };
      mockGet.mockRejectedValue(axiosError);
    },
    input: [createMockEvent()],
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: expect.stringContaining('API request failed with status 401')
    }
  },
  {
    name: 'should return error when axios throws a network exception',
    setup: (mockGet) => {
      const networkError = new Error('Network error');
      mockGet.mockRejectedValue(networkError);
    },
    input: [createMockEvent()],
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: 'Network error'
    }
  },
  {
    name: 'should throw an error if events parameter is not an array',
    setup: () => {},
    input: null as unknown as AirdropEvent[], // Use null to test non-array input
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: 'Invalid input: events must be an array'
    }
  },
  {
    name: 'should throw an error if events array is empty',
    setup: () => {},
    input: [],
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: 'Invalid input: events array is empty'
    }
  },
  {
    name: 'should throw an error if an event is missing required fields',
    setup: () => {},
    input: [{
      payload: {},
      execution_metadata: {}
    } as unknown as AirdropEvent],
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: 'Invalid event: missing required field \'context\''
    }
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
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: 'Invalid event: missing required field \'payload.connection_data.key\''
    }
  },
  {
    name: 'should throw an error if Project ID is missing',
    setup: () => {},
    input: [{
      ...createMockEvent(),
      payload: {
        ...createMockEvent().payload,
        event_context: {
          ...createMockEvent().payload.event_context,
          external_sync_unit_id: undefined as any
        }
      }
    }],
    expectedResult: {
      status: 'error',
      message: 'Failed to fetch tasks from Wrike API',
      error: 'Invalid event: missing required field \'payload.event_context.external_sync_unit_id\''
    }
  }
];