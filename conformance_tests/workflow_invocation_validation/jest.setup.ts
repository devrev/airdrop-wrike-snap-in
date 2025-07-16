// Increase timeout for all tests to accommodate network requests
jest.setTimeout(60000);

// Suppress console output during tests to keep test output clean
// Only suppress in test environment
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
}

// Add proper error handling for unhandled promise rejections
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));