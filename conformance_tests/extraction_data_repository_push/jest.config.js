module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds as specified in requirements
  resetMocks: false, 
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  testSequencer: './test-sequencer.js',
  setupFilesAfterEnv: ['./jest.setup.js']
};