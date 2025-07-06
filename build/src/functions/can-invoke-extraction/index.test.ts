import { EventType } from '@devrev/ts-adaas';
import { canInvokeExtraction } from './index';

describe('canInvokeExtraction function', () => {
  it('should return that extraction can be invoked with valid event', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        event_type: EventType.ExtractionDataStart
      },
      context: {
        secrets: {
          service_account_token: 'mock-token'
        }
      }
    }];
    
    // Act
    const result = await canInvokeExtraction(mockEvents);
    
    // Assert
    expect(result).toEqual({
      can_invoke: true,
      message: 'Extraction workflow can be invoked successfully'
    });
  });

  it('should return false when no events are provided', async () => {
    // Arrange
    const mockEvents: any[] = [];
    
    // Act
    const result = await canInvokeExtraction(mockEvents);
    
    // Assert
    expect(result.can_invoke).toBe(false);
    expect(result.message).toContain('No events provided');
  });

  it('should return false when event payload is missing', async () => {
    // Arrange
    const mockEvents = [{ context: {} }];
    
    // Act
    const result = await canInvokeExtraction(mockEvents);
    
    // Assert
    expect(result.can_invoke).toBe(false);
    expect(result.message).toContain('Event payload or event_type is missing');
  });

  it('should return false when event type is not an extraction event', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        event_type: 'NOT_AN_EXTRACTION_EVENT'
      },
      context: {
        secrets: {
          service_account_token: 'mock-token'
        }
      }
    }];
    
    // Act
    const result = await canInvokeExtraction(mockEvents);
    
    // Assert
    expect(result.can_invoke).toBe(false);
    expect(result.message).toContain('is not an extraction event type');
  });

  it('should return false when authentication context is missing', async () => {
    // Arrange
    const mockEvents = [{
      payload: {
        event_type: EventType.ExtractionDataStart
      },
      context: {}
    }];
    
    // Act
    const result = await canInvokeExtraction(mockEvents);
    
    // Assert
    expect(result.can_invoke).toBe(false);
    expect(result.message).toContain('missing required authentication context');
  });

  it('should handle errors gracefully', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const mockError = new Error('Test error');
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw mockError;
    });
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Act
    const result = await canInvokeExtraction(mockEvents);
    
    // Assert
    expect(result.can_invoke).toBe(false);
    expect(result.message).toContain('Error validating extraction');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in canInvokeExtraction function:', mockError);
  });
});