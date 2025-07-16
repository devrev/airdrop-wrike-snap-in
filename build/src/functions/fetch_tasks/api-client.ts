import axios from 'axios';

/**
 * Interface for a Wrike task
 */
export interface WrikeTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  importance: string;
  created_date: string;
  updated_date: string;
  completed_date?: string;
  due_date?: string;
  parent_ids: string[];
  responsible_ids?: string[];
  author_ids?: string[];
  custom_status_id?: string;
  permalink?: string;
}

/**
 * Client for interacting with the Wrike API
 */
export class WrikeApiClient {
  private readonly apiEndpoint: string = 'https://www.wrike.com/api/v4';
  private readonly apiKey: string;
  private readonly timeout: number = 10000;

  /**
   * Creates a new instance of the WrikeApiClient
   * @param apiKey The Wrike API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetches tasks for a specific project
   * @param projectId The ID of the project
   * @returns An array of WrikeTask objects
   */
  async fetchProjectTasks(projectId: string): Promise<WrikeTask[]> {
    const response = await axios.get(`${this.apiEndpoint}/folders/${projectId}/tasks`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      params: {
        descendants: true,
        subTasks: true
      },
      timeout: this.timeout
    });

    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(`Failed to fetch tasks with status ${response.status}`);
    }
    
    // Process the response data
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid response format from Wrike API for tasks');
    }
    
    // Transform the response data into our task format
    return response.data.data.map((task: any) => this.transformTaskData(task));
  }

  /**
   * Transforms raw task data from the API into our WrikeTask format
   * @param task Raw task data from the API
   * @returns Transformed WrikeTask object
   */
  private transformTaskData(task: any): WrikeTask {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      importance: task.importance,
      created_date: task.createdDate || '',
      updated_date: task.updatedDate || '',
      completed_date: task.completedDate,
      due_date: task.dueDate,
      parent_ids: task.parentIds || [],
      responsible_ids: task.responsibleIds,
      author_ids: task.authorIds,
      custom_status_id: task.customStatusId,
      permalink: task.permalink
    };
  }
}