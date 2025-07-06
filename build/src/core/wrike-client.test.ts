import axios, { AxiosInstance } from 'axios';
import { WrikeClient } from './wrike-client';
import { createGetProjectsMock, createGetSpaceContactsMock, testData } from './wrike-client.test.data';
import { createMockAxiosInstance, createMockAxiosError } from './wrike-client.test.helpers';
// Import extendedMockData from the correct file
import { extendedMockData } from './wrike-client.test.helpers.extended';
import { WrikeApiService } from './wrike-api-service';

// Mock axios
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WrikeClient', () => {
  // Mock WrikeApiService
  jest.mock('./wrike-api-service');
  
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock axios instance with the methods we need
    mockAxiosInstance = createMockAxiosInstance();
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });
  
  describe('constructor', () => {
    it('should throw an error if API key is not provided', () => {
      // Act & Assert
      expect(() => new WrikeClient('')).toThrow('Wrike API key is required');
    });

    it('should create an axios instance with correct configuration', () => {
      // Arrange
      const apiKey = 'test-api-key';
      
      // Act
      new WrikeClient(apiKey);
      
      // Assert
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://www.wrike.com/api/v4',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    });
  });

  describe('get', () => {
    it('should make a GET request to the specified path', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const path = '/contacts';
      const mockResponse = { data: { kind: 'contacts', data: [] } };
      
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);
      
      // Act
      const result = await client.get(path);

      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(path, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors correctly', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const path = '/contacts';
      
      const mockError = createMockAxiosError(401, 'Unauthorized');
      
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);
      
      // Act & Assert
      await expect(client.get(path)).rejects.toThrow('Authentication failed: Invalid API key');
    });
  });

  describe('testAuthentication', () => {
    it('should return success when authentication is successful', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      
      mockAxiosInstance.get.mockResolvedValueOnce(testData.contacts.success);
      
      // Act
      const result = await client.testAuthentication();
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully authenticated');
      expect(result.details?.contacts_count).toBe(2);
    });

    it('should return failure when authentication fails', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      
      const mockError = createMockAxiosError(401, 'Unauthorized');
      
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      // Act
      const result = await client.testAuthentication();
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });

    it('should return failure when response is unexpected', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      
      mockAxiosInstance.get.mockResolvedValueOnce(testData.contacts.unexpected);
      
      // Act
      const result = await client.testAuthentication();
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Received unexpected response');
    });
  });

  describe('getProjects', () => {
    it('should return an array of projects when successful', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const spaceId = 'space-123';
      
      mockAxiosInstance.get.mockResolvedValueOnce(testData.projects.success);
      
      // Act
      const result = await client.getProjects(spaceId);
      
      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/spaces/${spaceId}/folders?project=true`, undefined);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('project-1');
      expect(result[0].title).toBe('Project 1');
      expect(result[0].status).toBe('Green');
      expect(result[1].id).toBe('project-2');
      expect(result[1].description).toBe(''); // Default value for missing description
    });

    it('should throw an error when spaceId is not provided', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      
      // Act & Assert
      await expect(client.getProjects('')).rejects.toThrow('Space ID is required');
    });

    it('should handle API errors correctly', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const spaceId = 'space-123';
      
      const mockError = new Error('API Error');
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);
      
      // Act & Assert
      await expect(client.getProjects(spaceId)).rejects.toThrow();
    });
  });

  describe('getSpaceContacts', () => {
    it('should return an array of contacts when successful', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const spaceId = 'space-123';
      
      // Mock the space response with members
      mockAxiosInstance.get.mockImplementation((path) => {
        if (path === `/spaces/${spaceId}?fields=[members]`) {
          return Promise.resolve({
            status: 200,
            data: {
              data: [{
                id: spaceId,
                members: ['contact-1', 'contact-2']
              }]
            }
          });
        } else if (path === '/contacts/contact-1,contact-2') {
          return Promise.resolve({
            status: 200,
            data: {
              data: [
                {
                  id: 'contact-1',
                  firstName: 'John',
                  lastName: 'Doe',
                  profiles: [{ email: 'john@example.com' }]
                },
                {
                  id: 'contact-2',
                  firstName: 'Jane',
                  lastName: 'Smith',
                  profiles: [{ email: 'jane@example.com' }]
                }
              ]
            }
          });
        }
        return Promise.reject(new Error('Unexpected path'));
      });
      
      // Act
      const result = await client.getSpaceContacts(spaceId);
      
      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/spaces/${spaceId}?fields=[members]`, undefined);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/contacts/contact-1,contact-2', undefined);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('contact-1');
      expect(result[0].full_name).toBe('John Doe');
      expect(result[0].email).toBe('john@example.com');
      expect(result[1].id).toBe('contact-2');
      expect(result[1].full_name).toBe('Jane Smith');
    });

    it('should throw an error when spaceId is not provided', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      
      // Act & Assert
      await expect(client.getSpaceContacts('')).rejects.toThrow('Space ID is required');
    });

    it('should return empty array when space has no members', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const spaceId = 'space-123';
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [{
            id: spaceId,
            members: []
          }]
        }
      });
      
      // Act
      const result = await client.getSpaceContacts(spaceId);
      
      // Assert
      expect(result).toEqual([]);
    });

    it('should handle API errors correctly', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const spaceId = 'space-123';
      
      const mockError = createMockAxiosError(404, 'Not Found');
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);
      mockedAxios.isAxiosError.mockReturnValue(true);
      
      // Act & Assert
      await expect(client.getSpaceContacts(spaceId)).rejects.toThrow('Resource not found');
    });

    it('should handle missing members field in space response', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const spaceId = 'space-123';
      
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [{
            id: spaceId
            // No members field
          }]
        }
      });
      
      // Act
      const result = await client.getSpaceContacts(spaceId);
      
      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getProjectTasks', () => {
    it('should return an array of tasks when successful', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const projectId = 'IEACW7SVI4PZXTGO'; // Using a valid format project ID that matches the regex
      
      // Mock the axios get method for this specific path
      mockAxiosInstance.get.mockImplementation((path) => {
        if (path === `/folders/${projectId}/tasks?descendants=true&subTasks=true`) {
          return Promise.resolve({
            status: 200,
            data: {
              data: [
                {
                  id: 'task-1',
                  title: 'Task 1',
                  description: 'Description 1',
                  status: 'Active',
                  createdDate: '2023-01-01T00:00:00Z',
                  updatedDate: '2023-01-02T00:00:00Z',
                  responsibleIds: ['user-1'],
                  parentIds: ['folder-1'],
                  attachmentCount: 2
                },
                {
                  id: 'task-2',
                  title: 'Task 2',
                  status: 'Completed',
                  createdDate: '2023-01-03T00:00:00Z',
                  updatedDate: '2023-01-04T00:00:00Z',
                  responsibleIds: ['user-2'],
                  parentIds: ['folder-1'],
                  attachmentCount: 0
                }
              ]
            }
          });
        }
        return Promise.reject(new Error(`Unexpected path: ${path}`));
      });
      
      // Act
      const result = await client.getProjectTasks(projectId);
      
      // Assert
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/folders/${projectId}/tasks?descendants=true&subTasks=true`, undefined);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(result[0].title).toBe('Task 1');
      expect(result[0].status).toBe('Active');
      expect(result[0].has_attachments).toBe(true);
      expect(result[1].id).toBe('task-2');
      expect(result[1].description).toBe(''); // Default value for missing description
      expect(result[1].has_attachments).toBe(false);
    });

    it('should throw an error when projectId is not provided', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      
      // Act & Assert
      await expect(client.getProjectTasks('')).rejects.toThrow('Project ID is required');
    });

    it('should handle API errors correctly', async () => {
      // Arrange
      const client = new WrikeClient('test-api-key');
      const projectId = 'IEACW7SVI4PZXTGO'; // Using a valid format project ID
      
      const mockError = new Error('API Error');
      mockAxiosInstance.get.mockRejectedValueOnce(mockError);
      
      // Act & Assert
      await expect(client.getProjectTasks(projectId)).rejects.toThrow();
    });
  });
});