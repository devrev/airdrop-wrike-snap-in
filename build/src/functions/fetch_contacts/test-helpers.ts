import axios from 'axios';

/**
 * Sets up the axios mocks for testing
 * @returns The mock functions that can be used in tests
 */
export function setupAxiosMocks() {
  // Set up axios mock functions
  const mockGet = jest.fn();

  // Properly mock axios methods
  jest.spyOn(axios, 'get').mockImplementation(mockGet);

  // Properly mock axios.isAxiosError with correct type handling
  jest.spyOn(axios, 'isAxiosError').mockImplementation((error: any) => {
    return error && error.isAxiosError === true;
  });

  return { mockGet };
}

/**
 * Sets up common test environment
 */
export function setupTestEnvironment() {
  // Mock console.log and console.error to prevent test output pollution
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
}

/**
 * Cleans up the test environment
 */
export function cleanupTestEnvironment() {
  // Restore console mocks
  jest.restoreAllMocks();
}