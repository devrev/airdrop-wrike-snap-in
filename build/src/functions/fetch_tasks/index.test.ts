// Mock axios before any imports
jest.mock('axios');

// Import the test utilities and helpers
import { createMockEvent } from './test-utils';
import { setupAxiosMocks, setupTestEnvironment, cleanupTestEnvironment } from './test-helpers';
import { AirdropEvent } from '@devrev/ts-adaas';
import { run } from './index';
import { testCases } from './test-cases';

describe('Fetch Tasks Function', () => {
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
      'https://www.wrike.com/api/v4/folders/IEACW7SVI4OMYFIY/tasks',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer mock-api-key'
        },
        params: {
          descendants: true,
          subTasks: true
        },
        timeout: 10000
      })
    );
  });

  // Generate tests from test cases
  testCases.forEach(testCase => {
    it(testCase.name, async () => {
      testCase.setup(mockGet);
      
      const result = await run(testCase.input);
      expect(result).toEqual(testCase.expectedResult);
    });
  });
});