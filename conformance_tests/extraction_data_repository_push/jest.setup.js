// Increase the timeout for all tests
jest.setTimeout(60000); // Reduced to ensure tests complete within the overall limit

// Initialize global variables if they don't exist
global.receivedEvents = global.receivedEvents || [];
global.eventPromiseResolvers = global.eventPromiseResolvers || {};
global.receivedEventTypes = global.receivedEventTypes || [];

// Reset global state before each test
beforeEach(() => {
  // Clear events before each test
  global.receivedEvents = [];
  global.eventPromiseResolvers = {};
});

// Log when tests start and finish
beforeEach(() => console.log(`[${new Date().toISOString()}] Starting test`));
beforeAll(() => console.log(`[${new Date().toISOString()}] Starting tests`));
afterAll(() => console.log(`[${new Date().toISOString()}] Finished tests`));

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection:`, reason);
});

// Add a global timeout to ensure tests don't hang
afterEach(async () => {
  console.log(`[${new Date().toISOString()}] Test completed`);
  console.log(`Received events: ${global.receivedEventTypes.join(', ')}`);
});