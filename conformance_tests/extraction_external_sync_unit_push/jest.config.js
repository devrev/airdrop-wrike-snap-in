module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds as per requirements
  resetMocks: false,
  testMatch: [
    '**/*.test.ts',
    '*.test.ts'
  ],
};