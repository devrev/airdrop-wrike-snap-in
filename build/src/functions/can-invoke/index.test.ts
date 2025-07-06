import { canInvoke } from './index';

describe('canInvoke function', () => {
  it('should return that the function can be invoked', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    
    // Act
    const result = await canInvoke(mockEvents);
    
    // Assert
    expect(result).toEqual({
      can_invoke: true,
      message: 'Function can be invoked successfully'
    });
  });

  it('should log the received events', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Act
    await canInvoke(mockEvents);
    
    // Assert
    expect(consoleSpy).toHaveBeenCalledWith('Received events:', JSON.stringify(mockEvents));
  });

  it('should handle errors properly', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const mockError = new Error('Test error');
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw mockError;
    });
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Act & Assert
    await expect(canInvoke(mockEvents)).rejects.toThrow(mockError);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in canInvoke function:', mockError);
  });
});