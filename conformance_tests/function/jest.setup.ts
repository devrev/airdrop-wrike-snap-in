// Increase timeout for all tests to accommodate network requests
jest.setTimeout(30000);

// Log information about test environment
console.log('Setting up test environment...');
console.log(`Test server URL: http://localhost:8000/handle/sync`);
console.log(`Callback server port: 8002`);
console.log(`Worker data server URL: http://localhost:8003/external-worker`);
console.log(`DevRev server URL: http://localhost:8003`);