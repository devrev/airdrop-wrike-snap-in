// Mock axios before any imports
jest.mock('axios');

// Import the test utilities and helpers
import { createMockEvent } from './test-utils';
import { setupAxiosMocks, setupTestEnvironment, cleanupTestEnvironment } from './test-helpers';
import { AirdropEvent } from '@devrev/ts-adaas';
import { run } from './index';
import { testCases } from './test-cases';

describe('Fetch Projects Function', () => {
  // Set up axios mocks
  const { mockGet } = setupAxiosMocks();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set up test environment
    setupTestEnvironment();
  });

  afterEach(() => {
    // Clean up test environment
    cleanupTestEnvironment();
  });

  // Add a test for API call parameters verification
  it('should call the Wrike API with correct parameters', async () => {
    // Use the first test case which has a successful API call
    const testCase = testCases[0];
    testCase.setup(mockGet);
    
    await run(testCase.input);
    
    expect(mockGet).toHaveBeenCalledWith(
      'https://www.wrike.com/api/v4/spaces/IEACW7SVI4O6BDQE/folders',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-api-key'
        },
        params: {
          descendants: true
        },
        timeout: 10000
      })
    );
  });

  // Generate tests from test cases
  testCases.forEach(testCase => {
    it(testCase.name, async () => {
      testCase.setup(mockGet);
      
      // For test cases that expect the function to handle invalid inputs,
      // we need to pass an empty array and let the function itself detect
      // and handle the error condition. This avoids TypeScript errors while
      // still testing the function's error handling capabilities.
      
      const result = await run(testCase.input);
      expect(result).toEqual(testCase.expectedResult);
    });
  });
});