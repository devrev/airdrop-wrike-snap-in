module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000, // 30 seconds per test
  verbose: true,
  testMatch: ['**/test-*.ts'],
};