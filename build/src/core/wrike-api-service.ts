import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { WrikeApiResources } from './wrike-api-resources';

/**
 * Service for making API calls to Wrike endpoints
 */
export class WrikeApiService {
  private client: AxiosInstance;
  private baseUrl = 'https://www.wrike.com/api/v4';
  private resources: WrikeApiResources;

  /**
   * Creates a new WrikeApiService instance
   * 
   * @param apiKey - The Wrike API key
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Wrike API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 seconds timeout
    });

    // Initialize the resources with the get method
    this.resources = new WrikeApiResources(this.get.bind(this));
  }

  /**
   * Makes a GET request to the Wrike API
   * 
   * @param path - The API endpoint path
   * @param config - Optional axios request configuration
   * @returns The API response
   */
  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.client.get<T>(path, config);
    } catch (error) {
      this.handleApiError(error);
      throw error; // This line will only execute if handleApiError doesn't throw
    }
  }

  /**
   * Handles errors from the Wrike API
   * 
   * @param error - The error from the API request
   */
  private handleApiError(error: any): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data || {};

      // Check if status is defined before comparing
      if (status === undefined) {
        throw new Error(`Network error: ${error.message}`);
      } else if (status === 401) {
        throw new Error('Authentication failed: Invalid API key');
      } else if (status === 403) {
        throw new Error('Authorization failed: Insufficient permissions');
      } else if (status === 404) {
        throw new Error('Resource not found: The requested resource does not exist');
      } else if (status >= 400 && status < 500) {
        const errorMsg = data?.error || error.message;
        throw new Error(`Client error: ${errorMsg}`);
      } else if (status >= 500 && status < 600) {
        const errorMsg = data?.error || error.message;
        throw new Error(`Server error: ${errorMsg}`);
      }
    }
    
    throw new Error(`Unknown error: ${error.message || 'No error message available'}${error.response?.data ? ` (${JSON.stringify(error.response.data)})` : ''}`);
  }

  /**
   * Fetches projects from a specific space in Wrike
   * 
   * @param spaceId - The ID of the space to fetch projects from
   * @returns A promise that resolves to an array of projects
   */
  async getProjects(spaceId: string): Promise<any[]> {
    try {
      return await this.resources.getProjects(spaceId);
    } catch (error) {
      this.handleApiError(error);
      throw error; // Re-throw the error to ensure it's properly handled by the caller
    }
  }

  /**
   * Fetches contacts from a specific space in Wrike
   * 
   * @param spaceId - The ID of the space to fetch contacts from
   * @returns A promise that resolves to an array of contacts
   */
  async getSpaceContacts(spaceId: string): Promise<any[]> {
    try {
      return await this.resources.getSpaceContacts(spaceId);
    } catch (error) {
      this.handleApiError(error);
      throw error; // Re-throw the error to ensure it's properly handled by the caller
    }
  }

  /**
   * Fetches contact details by IDs
   * 
   * @param contactIds - Array of contact IDs to fetch
   * @returns A promise that resolves to an array of contact details
   */
  async getContactsByIds(contactIds: string[]): Promise<any[]> {
    try {
      return await this.resources.getContactsByIds(contactIds);
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Fetches tasks from a specific project in Wrike
   * 
   * @param projectId - The ID of the project to fetch tasks from
   * @returns A promise that resolves to an array of tasks
   */
  async getProjectTasks(projectId: string): Promise<any[]> {
    try {
      return await this.resources.getProjectTasks(projectId);
    } catch (error) {
      this.handleApiError(error);
      throw error; // Re-throw the error to ensure it's properly handled by the caller
    }
  }
}