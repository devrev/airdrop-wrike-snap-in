// Increase timeout for all tests to 10 seconds
jest.setTimeout(10000);

// Suppress axios error logging in tests
process.env.NODE_ENV = 'test';
