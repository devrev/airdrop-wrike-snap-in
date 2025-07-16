module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds timeout as per requirements
  setupFiles: ['./jest.setup.ts'], 
  forceExit: true, // Force Jest to exit after all tests complete
  testMatch: ['**/*.test.ts'],
  verbose: true
};