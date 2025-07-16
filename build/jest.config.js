module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000, // Increase default timeout to 60 seconds
  resetMocks: false, // Don't reset mocks between tests to maintain mock behavior
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};