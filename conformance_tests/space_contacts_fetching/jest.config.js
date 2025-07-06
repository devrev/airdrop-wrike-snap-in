module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds as per requirements
  testMatch: ['**/*.test.ts'], 
  forceExit: true, // Force Jest to exit after all tests complete
  verbose: true,
  // Add this to help with open handles
  detectOpenHandles: true
};