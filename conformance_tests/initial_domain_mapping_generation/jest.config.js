module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds timeout as per requirements
  resetMocks: false, 
  forceExit: true,     // Force Jest to exit after all tests complete
  detectOpenHandles: true // Help identify open handles
};