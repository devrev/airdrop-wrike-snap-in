// This file is used to set up global Jest configuration
// It helps with handling open handles, timeouts, and global error handling

// Set a global timeout to force-close any hanging connections
jest.setTimeout(120000); // 120 seconds as per requirements

// Add a global afterAll hook to help clean up any remaining connections
afterAll(async () => {
  // Small delay to allow any pending operations to complete
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 1000);
    // Ensure the timeout is cleared if the process is exiting
    process.on('exit', () => {
      clearTimeout(timeout);
    });
  });
});

// Add global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process as Jest will handle this
});

// Add global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process as Jest will handle this
});