import * as fs from 'fs';
import * as path from 'path';
import { generate_initial_domain_mapping } from './index';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('generate_initial_domain_mapping function', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return mapping when file exists and is valid', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const mockMapping = {
      format_version: 'v1',
      devrev_metadata_version: 1,
      additional_mappings: {
        record_type_mappings: {
          tasks: { default_mapping: { object_category: 'stock', object_type: 'issue' } },
          users: { default_mapping: { object_category: 'stock', object_type: 'devu' } }
        }
      }
    };
    
    // Mock fs.existsSync to return true
    mockedFs.existsSync.mockReturnValue(true);
    
    // Mock fs.readFileSync to return mock mapping
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockMapping));
    
    // Act
    const result = await generate_initial_domain_mapping(mockEvents);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.message).toContain('Successfully generated');
    expect(result.mapping).toEqual(mockMapping);
    expect(mockedFs.existsSync).toHaveBeenCalled();
    expect(mockedFs.readFileSync).toHaveBeenCalled();
  });

  it('should return false when mapping file does not exist', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    
    // Mock fs.existsSync to return false
    mockedFs.existsSync.mockReturnValue(false);
    
    // Act
    const result = await generate_initial_domain_mapping(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('file not found');
    expect(mockedFs.existsSync).toHaveBeenCalled();
    expect(mockedFs.readFileSync).not.toHaveBeenCalled();
  });

  it('should return false when mapping is invalid', async () => {
    // Arrange
    const mockEvents = [{ test: 'event' }];
    const invalidMapping = {
      format_version: 'v1',
      // Missing additional_mappings
    };
    
    // Mock fs.existsSync to return true
    mockedFs.existsSync.mockReturnValue(true);
    
    // Mock fs.readFileSync to return invalid mapping
    mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidMapping));
    
    // Act
    const result = await generate_initial_domain_mapping(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid Initial Domain Mapping');
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
    const result = await generate_initial_domain_mapping(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error generating Initial Domain Mapping');
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
    const result = await generate_initial_domain_mapping(mockEvents);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error generating Initial Domain Mapping');
    expect(result.details?.error).toContain('Test error');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in generate_initial_domain_mapping function:', mockError);
  });
});