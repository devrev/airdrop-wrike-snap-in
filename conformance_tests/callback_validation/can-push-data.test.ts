import { CallbackServer } from './callback-server';
import { SnapInClient } from './snap-in-client';

jest.setTimeout(60000); // Increase timeout for individual tests

describe('canPushData Function Tests', () => {
  let callbackServer: CallbackServer;
  let snapInClient: SnapInClient;

  beforeAll(async () => {
    // Start the callback server
    callbackServer = new CallbackServer();
    await callbackServer.start();
    console.log('Callback server started successfully');
    
    // Initialize the snap-in client
    snapInClient = new SnapInClient();
  });

  afterAll(async () => {
    // Stop the callback server
    await callbackServer.stop();
    console.log('Callback server stopped successfully');
  });

  beforeEach(() => {
    // Reset the callback server state before each test
    callbackServer.clearReceivedData();
    callbackServer.simulateFailure(false);
  });

  test('Basic Functionality: Should successfully push data to callback URL', async () => {
    // Arrange
    const callbackUrl = callbackServer.getCallbackUrl();
    
    console.log(`Testing with callback URL: ${callbackUrl}`);
    // Act
    const response = await snapInClient.invokeCanPushData(callbackUrl);
    
    console.log('Response received:', JSON.stringify(response));
    // Assert
    expect(response.function_result.can_push).toBe(true);
    expect(response.function_result.message).toContain('Successfully pushed data');
    
    // Verify that the callback server received data
    const receivedData = callbackServer.getReceivedData();
    expect(receivedData.length).toBe(1);
    expect(receivedData[0]).toHaveProperty('test_data', true);
    expect(receivedData[0]).toHaveProperty('timestamp');
    expect(receivedData[0]).toHaveProperty('message');
  });

  test('Error Handling: Should report failure when callback URL is unreachable', async () => {
    // Arrange
    const unreachableUrl = 'http://localhost:9999/nonexistent';
    
    // Act
    const response = await snapInClient.invokeCanPushData(unreachableUrl);
    
    // Assert
    expect(response.function_result.can_push).toBe(false);
    expect(response.function_result.message).toContain('Failed to push data');
    expect(response.function_result.details).toBeDefined();
  });

  test('Error Handling: Should report failure when callback server returns error', async () => {
    // Arrange
    const callbackUrl = callbackServer.getCallbackUrl();
    callbackServer.simulateFailure(true);
    
    // Act
    const response = await snapInClient.invokeCanPushData(callbackUrl);
    
    // Assert
    expect(response.function_result.can_push).toBe(false);
    expect(response.function_result.message).toContain('Failed to push data to callback URL');
    expect(response.function_result.details).toBeDefined();
    expect(response.function_result.details.error_message).toContain('Request failed with status code 500');
  });

  test('Payload Validation: Should report failure when event payload is missing callback URL', async () => {
    // Create a custom event with missing callback_url by using an empty string
    const response = await snapInClient.invokeCanPushData('');
    
    // Assert
    expect(response.function_result.can_push).toBe(false);
    expect(response.function_result.message).toContain('Event payload or callback_url is missing');
    expect(response.function_result.details).toBeDefined();
  });
});