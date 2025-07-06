import * as fs from 'fs';
import * as path from 'path';
import { readInitialDomainMapping, readInitialDomainMappingAsString } from './domain-mapping-utils';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('domain-mapping-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('readInitialDomainMapping', () => {
    it('should return the content of the mapping file when it exists', () => {
      // Arrange 
      const mockMappingObj = { format_version: 'v1', devrev_metadata_version: 1, additional_mappings: { test: 'mapping' } };
      const mockMapping = JSON.stringify(mockMappingObj);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockMapping);
      
      // Act
      const result = readInitialDomainMapping();
      
      // Assert
      expect(result).toEqual(mockMappingObj);
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.readFileSync).toHaveBeenCalled();
    });

    it('should return null when the file does not exist', () => {
      // Arrange 
      mockedFs.existsSync.mockReturnValue(false);
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Act
      const result = readInitialDomainMapping();
      
      // Assert
      expect(result).toBeNull();
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Initial Domain Mapping file not found at:',
        expect.any(String)
      );
    });

    it('should return null and log error when reading file fails', () => {
      // Arrange
      const mockError = new Error('Read error');
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw mockError;
      });
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Act
      const result = readInitialDomainMapping();
      
      // Assert
      expect(result).toBeNull();
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reading Initial Domain Mapping file:',
        mockError
      );
    });
  });

  describe('readInitialDomainMappingAsString', () => {
    it('should return the content of the mapping file as a string when it exists', () => {
      // Arrange 
      const mockMapping = '{"format_version":"v1","devrev_metadata_version":1,"additional_mappings":{"test":"mapping"}}';
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(mockMapping);
      
      // Act
      const result = readInitialDomainMappingAsString();
      
      // Assert
      expect(result).toEqual(mockMapping);
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.readFileSync).toHaveBeenCalled();
    });

    it('should return null when the file does not exist', () => {
      // Arrange 
      mockedFs.existsSync.mockReturnValue(false);
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Act
      const result = readInitialDomainMappingAsString();
      
      // Assert
      expect(result).toBeNull();
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Initial Domain Mapping file not found at:',
        expect.any(String)
      );
    });

    it('should return null and log error when reading file fails', () => {
      // Arrange
      const mockError = new Error('Read error');
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw mockError;
      });
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Act
      const result = readInitialDomainMappingAsString();
      
      // Assert
      expect(result).toBeNull();
      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reading Initial Domain Mapping file as string:',
        mockError
      );
    });
  });
});