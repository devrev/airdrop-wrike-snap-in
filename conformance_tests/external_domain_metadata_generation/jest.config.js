module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds timeout as per requirements
  resetMocks: false,
  globals: { 'ts-jest': { tsconfig: 'tsconfig.test.json' } },
  testMatch: ['**/*.test.ts'],
};