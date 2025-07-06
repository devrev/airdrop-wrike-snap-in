import { EventType, spawn } from '@devrev/ts-adaas';
import { readInitialDomainMapping } from '../../core/domain-mapping-utils';
import { extraction } from './index';
import { createMockError, mockEvents } from './test-helpers';
import { assertFailedExtraction, assertSpawnError, assertSuccessfulExtraction } from './extraction.test.helpers';

/**
 * Test case implementations for the extraction function
 */
export const testCases = {
  testExternalSyncUnitsSuccess: async () => {
    // Act
    const result = await extraction(mockEvents.valid);
    
    // Assert
    assertSuccessfulExtraction(
      result, 
      EventType.ExtractionExternalSyncUnitsStart,
      'worker.ts'
    );
    
    // Additional specific assertions for this test case
    expect(spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState: expect.objectContaining({
          externalSyncUnits: expect.objectContaining({
            apiKey: 'valid-api-key',
            spaceId: 'space-id'
          })
        })
      })
    );
  },

  testMetadataExtractionSuccess: async () => {
    // Act
    const result = await extraction(mockEvents.validMetadata);
    
    // Assert
    assertSuccessfulExtraction(
      result, 
      EventType.ExtractionMetadataStart,
      'metadata-worker.ts'
    );
    
    // Additional specific assertions for this test case
    expect(spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState: expect.objectContaining({
          metadata: expect.objectContaining({
            completed: false
          })
        })
      })
    );
  },

  testDataExtractionSuccess: async () => {
    // Act
    const result = await extraction(mockEvents.validData);
    
    // Assert
    assertSuccessfulExtraction(
      result, 
      EventType.ExtractionDataStart,
      'data-worker.ts'
    );
    
    // Additional specific assertions for this test case
    expect(spawn).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState: expect.objectContaining({
          data: expect.objectContaining({
            apiKey: 'valid-api-key',
            spaceId: 'space-id',
            projectId: expect.any(String)
          })
        })
      })
    );
  },

  testAttachmentsExtractionSuccess: async () => {
    // Act
    const result = await extraction(mockEvents.validAttachments);
    
    // Assert
    assertSuccessfulExtraction(
      result, 
      EventType.ExtractionAttachmentsStart,
      'attachments-worker.ts'
    );
  },

  testMissingExternalSyncUnitId: async () => {
    // Act
    const result = await extraction(mockEvents.missingExternalSyncUnitId);
    
    // Assert
    assertFailedExtraction(result, 'missing required external_sync_unit_id');
  },

  testNoEvents: async () => {
    // Act
    const result = await extraction(mockEvents.empty);
    
    // Assert
    assertFailedExtraction(result, 'No events provided');
  },

  testMissingPayload: async () => {
    // Act
    const result = await extraction(mockEvents.missingPayload);
    
    // Assert
    assertFailedExtraction(result, 'Event payload or event_type is missing');
  },

  testUnsupportedEventType: async () => {
    // Act
    const result = await extraction(mockEvents.unsupportedEventType);
    
    // Assert
    assertFailedExtraction(result, 'Unsupported event type');
  },

  testMissingAuthContext: async () => {
    // Act
    const result = await extraction(mockEvents.missingAuthContext);
    
    // Assert
    assertFailedExtraction(result, 'missing required authentication context');
  },

  testMissingConnectionData: async () => {
    // Act
    const result = await extraction(mockEvents.missingConnectionData);
    
    // Assert
    assertFailedExtraction(result, 'missing required connection data');
  },

  testMissingApiKey: async () => {
    // Act
    const result = await extraction(mockEvents.missingApiKey);
    
    // Assert
    assertFailedExtraction(result, 'missing required connection data');
  },

  testMissingSpaceId: async () => {
    // Act
    const result = await extraction(mockEvents.missingSpaceId);
    
    // Assert
    assertFailedExtraction(result, 'missing required connection data');
  },

  testSpawnErrorForExternalSyncUnits: async () => {
    // Arrange
    const mockError = new Error('Spawn error');
    (spawn as jest.Mock).mockRejectedValueOnce(mockError);
    
    // Act
    const result = await extraction(mockEvents.valid);
    
    // Assert
    assertSpawnError(result, 'Failed to execute external sync units extraction');
  },

  testSpawnErrorForMetadataExtraction: async () => {
    // Arrange
    const mockError = new Error('Spawn error');
    (spawn as jest.Mock).mockRejectedValueOnce(mockError);
    
    // Act
    const result = await extraction(mockEvents.validMetadata);
    
    // Assert
    assertSpawnError(result, 'Failed to execute metadata extraction');
  },

  testSpawnErrorForAttachmentsExtraction: async () => {
    // Arrange
    const mockError = new Error('Spawn error');
    (spawn as jest.Mock).mockRejectedValueOnce(mockError);
    
    // Act
    const result = await extraction(mockEvents.validAttachments);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to execute attachments extraction');
    expect(result.details?.error).toContain('Spawn error');
  },

  testUnexpectedErrors: async () => {
    // Arrange
    const mockError = createMockError('Test error');
    jest.spyOn(console, 'log').mockImplementation(() => {
      throw mockError;
    });
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Act
    const result = await extraction(mockEvents.valid);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error during extraction');
    expect(readInitialDomainMapping).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in extraction function:', mockError);
  }
};