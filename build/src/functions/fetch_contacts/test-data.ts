import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * Mock API responses for Wrike API
 */
export const mockResponses = {
  /**
   * Successful response for space with members
   */
  successfulSpaceResponse: {
    status: 200,
    data: {
      data: [
        {
          id: 'IEACW7SVI4O6BDQE',
          title: 'Test Space',
          members: [
            { id: 'KUAFY3BJ' },
            { id: 'KUAFZBCJ' }
          ]
        }
      ]
    }
  },

  /**
   * Successful response for contacts
   */
  successfulContactsResponse: {
    status: 200,
    data: {
      data: [
        {
          id: 'KUAFY3BJ',
          firstName: 'John',
          lastName: 'Doe',
          type: 'Person',
          profiles: [
            {
              email: 'john.doe@example.com',
              avatarUrl: 'https://example.com/avatar1.jpg',
              timezone: 'America/New_York',
              locale: 'en-US'
            }
          ],
          title: 'Software Engineer',
          companyName: 'Example Corp',
          phone: '+1234567890',
          location: 'New York',
          deleted: false,
          me: false
        },
        {
          id: 'KUAFZBCJ',
          firstName: 'Jane',
          lastName: 'Smith',
          type: 'Person',
          profiles: [
            {
              email: 'jane.smith@example.com',
              avatarUrl: 'https://example.com/avatar2.jpg',
              timezone: 'Europe/London',
              locale: 'en-GB'
            }
          ],
          title: 'Product Manager',
          companyName: 'Example Corp',
          phone: '+0987654321',
          location: 'London',
          deleted: false,
          me: false
        }
      ]
    }
  },

  /**
   * Empty space response (no members)
   */
  emptySpaceResponse: {
    status: 200,
    data: {
      data: [
        {
          id: 'IEACW7SVI4O6BDQE',
          title: 'Test Space',
          members: []
        }
      ]
    }
  },

  /**
   * Error responses
   */
  errorResponses: {
    forbidden: {
      status: 403,
      data: { error: 'Forbidden' }
    },
    invalidFormat: {
      status: 200,
      data: { invalid: 'format' }
    }
  }
};

/**
 * Expected results for different test scenarios
 */
export const expectedResults = {
  /**
   * Expected result for successful contacts fetch
   */
  successfulFetch: {
    status: 'success',
    message: 'Successfully fetched 2 contacts from Wrike API',
    contacts: [
      {
        id: 'KUAFY3BJ',
        first_name: 'John',
        last_name: 'Doe',
        type: 'Person',
        profiles: [
          {
            email: 'john.doe@example.com',
            avatar_url: 'https://example.com/avatar1.jpg',
            timezone: 'America/New_York',
            locale: 'en-US'
          }
        ],
        title: 'Software Engineer',
        company_name: 'Example Corp',
        phone: '+1234567890',
        location: 'New York',
        is_deleted: false,
        me: false
      },
      {
        id: 'KUAFZBCJ',
        first_name: 'Jane',
        last_name: 'Smith',
        type: 'Person',
        profiles: [
          {
            email: 'jane.smith@example.com',
            avatar_url: 'https://example.com/avatar2.jpg',
            timezone: 'Europe/London',
            locale: 'en-GB'
          }
        ],
        title: 'Product Manager',
        company_name: 'Example Corp',
        phone: '+0987654321',
        location: 'London',
        is_deleted: false,
        me: false
      }
    ]
  },

  /**
   * Expected result for empty space
   */
  emptySpace: {
    status: 'success',
    message: 'No members found in the space',
    contacts: []
  },

  /**
   * Expected error results
   */
  errors: {
    spaceMembers: {
      status: 'error',
      message: 'Failed to fetch space members with status 403',
      error: 'Received status code 403'
    },
    contactDetails: {
      status: 'error',
      message: 'Failed to fetch contact details with status 403',
      error: 'Received status code 403'
    },
    invalidSpaceFormat: {
      status: 'error',
      message: 'Invalid response format from Wrike API for space members',
      error: 'Response data is not in the expected format'
    },
    invalidContactsFormat: {
      status: 'error',
      message: 'Invalid response format from Wrike API for contacts',
      error: 'Response data is not in the expected format'
    },
    axiosError: {
      status: 'error',
      message: 'Failed to fetch contacts from Wrike API',
      error: 'API request failed with status 401'
    },
    networkError: {
      status: 'error',
      message: 'Failed to fetch contacts from Wrike API',
      error: 'Network error'
    },
    invalidInput: {
      status: 'error',
      message: 'Invalid input: events must be an array',
      error: 'Invalid input: events must be an array'
    },
    emptyEvents: {
      status: 'error',
      message: 'Invalid input: events array is empty',
      error: 'Invalid input: events array is empty'
    },
    missingContext: {
      status: 'error',
      message: 'Invalid event: missing required field \'context\'',
      error: 'Invalid event: missing required field \'context\''
    },
    missingApiKey: {
      status: 'error',
      message: 'Invalid event: missing required field \'payload.connection_data.key\'',
      error: 'Invalid event: missing required field \'payload.connection_data.key\''
    },
    missingSpaceId: {
      status: 'error',
      message: 'Invalid event: missing required field \'payload.connection_data.org_id\'',
      error: 'Invalid event: missing required field \'payload.connection_data.org_id\''
    }
  }
};

/**
 * Helper function to create an Axios error
 */
export function createAxiosError(status: number): any {
  const axiosError = {
    isAxiosError: true,
    message: 'Request failed',
    response: { status }
  } as any;
  return axiosError;
}