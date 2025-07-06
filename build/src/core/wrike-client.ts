import { WrikeApiService } from './wrike-api-service';

/**
 * Client for interacting with the Wrike API
 */
export class WrikeClient {
  private apiService: WrikeApiService;

  /**
   * Creates a new WrikeClient instance
   * 
   * @param apiKey - The Wrike API key
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Wrike API key is required');
    }

    this.apiService = new WrikeApiService(apiKey);
  }

  /**
   * Tests the authentication with the Wrike API
   * 
   * @returns A promise that resolves if authentication is successful
   */
  async testAuthentication(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Make a simple request to get contacts (a basic endpoint that should always be accessible)
      const response = await this.apiService.get('/contacts');
      
      if (response.status === 200 && response.data && response.data.kind === 'contacts') {
        return {
          success: true,
          message: 'Successfully authenticated with Wrike API',
          details: {
            contacts_count: response.data.data?.length || 0
          }
        };
      } else {
        return {
          success: false,
          message: 'Received unexpected response from Wrike API',
          details: {
            status: response.status,
            data: response.data
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.stack : String(error)
        }
      };
    }
  }

  /**
   * Fetches projects from a specific space in Wrike
   * 
   * @param spaceId - The ID of the space to fetch projects from
   * @returns A promise that resolves to an array of projects
   */
  async getProjects(spaceId: string): Promise<any[]> {
    return this.apiService.getProjects(spaceId);
  }

  /**
   * Fetches tasks from a specific project in Wrike
   * 
   * @param projectId - The ID of the project to fetch tasks from
   * @returns A promise that resolves to an array of tasks
   */
  async getProjectTasks(projectId: string): Promise<any[]> {
    return this.apiService.getProjectTasks(projectId);
  }

  /**
   * Fetches contacts from a specific space in Wrike
   * 
   * @param spaceId - The ID of the space to fetch contacts from
   * @returns A promise that resolves to an array of contacts
   */
  async getSpaceContacts(spaceId: string): Promise<any[]> {
    return this.apiService.getSpaceContacts(spaceId);
  }

  /**
   * Makes a GET request to the Wrike API
   * 
   * @param path - The API endpoint path
   * @param config - Optional axios request configuration
   * @returns The API response
   */
  async get<T = any>(path: string, config?: any): Promise<any> {
    return this.apiService.get<T>(path, config);
  }
}