module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds as per requirements
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testMatch: ['**/*.test.ts']
};