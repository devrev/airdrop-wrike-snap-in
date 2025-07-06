import * as fs from 'fs';
import * as path from 'path';
import { generate_external_domain_metadata } from './index';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('generate_external_domain_metadata function', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return metadata when file exists and is valid', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const mockMetadata = {
      schema_version: 'v0.2.0',
      record_types: {
        tasks: { fields: {} },
        users: { fields: {} }
      }
    };
    
    // Mock fs.existsSync to return true
    mockedFs.existsSync.mockReturnValue(true);
    
    // Mock fs.readFileSync to return mock metadata
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockMetadata));
    
    // Act
    const result = await generate_external_domain_metadata(mockEvents);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully generated');
    expect(result.metadata).toEqual(mockMetadata);
    expect(mockedFs.existsSync).toHaveBeenCalled();
    expect(mockedFs.readFileSync).toHaveBeenCalled();
  });

  it('should return false when metadata file does not exist', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    
    // Mock fs.existsSync to return false
    mockedFs.existsSync.mockReturnValue(false);
    
    // Act
    const result = await generate_external_domain_metadata(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('file not found');
    expect(mockedFs.existsSync).toHaveBeenCalled();
    expect(mockedFs.readFileSync).not.toHaveBeenCalled();
  });

  it('should return false when metadata is invalid', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const invalidMetadata = {
      schema_version: 'v0.2.0',
      // Missing record_types
    };
    
    // Mock fs.existsSync to return true
    mockedFs.existsSync.mockReturnValue(true);
    
    // Mock fs.readFileSync to return invalid metadata
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidMetadata));
    
    // Act
    const result = await generate_external_domain_metadata(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid External Domain Metadata');
    expect(mockedFs.existsSync).toHaveBeenCalled();
    expect(mockedFs.readFileSync).toHaveBeenCalled();
  });

  it('should handle JSON parsing errors', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    
    // Mock fs.existsSync to return true
    mockedFs.existsSync.mockReturnValue(true);
    
    // Mock fs.readFileSync to return invalid JSON
    mockedFs.readFileSync.mockReturnValue('{ invalid json }');
    
    // Act
    const result = await generate_external_domain_metadata(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error generating External Domain Metadata');
    expect(mockedFs.existsSync).toHaveBeenCalled();
    expect(mockedFs.readFileSync).toHaveBeenCalled();
  });

  it('should handle unexpected errors gracefully', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const mockError = new Error('Test error');
    
    // Mock fs.existsSync to throw an error
    mockedFs.existsSync.mockImplementation(() => {
      throw mockError;
    });
    
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Act
    const result = await generate_external_domain_metadata(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error generating External Domain Metadata');
    expect(result.details?.error).toContain('Test error');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in generate_external_domain_metadata function:', mockError);
  });
});