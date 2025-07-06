module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 90000, // Increased to 90 seconds to accommodate Chef CLI validation
  verbose: true,
  forceExit: true, // Force Jest to exit after all tests complete
};