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
 * Interface for a Wrike contact
 */
export interface WrikeContact {
  id: string;
  first_name: string;
  last_name: string;
  type: string;
  profiles?: {
    email?: string;
    avatar_url?: string;
    timezone?: string;
    locale?: string;
  }[];
  title?: string;
  company_name?: string;
  phone?: string;
  location?: string;
  is_deleted?: boolean;
  me?: boolean;
}

/**
 * Client for interacting with the Wrike API
 */
export class WrikeApiClient {
  private readonly apiEndpoint: string = 'https://www.wrike.com/api/v4';
  private readonly apiKey: string;
  private readonly timeout: number = 60000; // Increased timeout for API calls

  /**
   * Creates a new instance of the WrikeApiClient
   * @param apiKey The Wrike API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetches contacts from Wrike API
   * @param spaceId The Space ID
   * @returns Array of WrikeContact objects
   */
  async fetchContacts(spaceId: string): Promise<WrikeContact[]> {
    try {
      console.log(`Fetching space members for space ID: ${spaceId}`);
      const spaceResponse = await axios.get(`${this.apiEndpoint}/spaces/${encodeURIComponent(spaceId)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          fields: '[members]'
        },
        timeout: this.timeout
      });
      
      if (spaceResponse.status !== 200) {
        throw new Error(`Failed to fetch space members with status ${spaceResponse.status}: ${JSON.stringify(spaceResponse.data || 'No response data')}`);
      }
      
      if (!spaceResponse.data || !spaceResponse.data.data || !Array.isArray(spaceResponse.data.data) || spaceResponse.data.data.length === 0) {
        throw new Error('Invalid response format from Wrike API for space members');
      }
      
      // Extract member IDs from the space response
      const spaceData = spaceResponse.data.data[0];
      
      if (!spaceData.members || !Array.isArray(spaceData.members)) {
        return [];
      }
      
      const memberIds = spaceData.members.map((member: any) => member.id);
      
      if (memberIds.length === 0) {
        return [];
      }
      
      console.log(`Fetching contact details for ${memberIds.length} members`);
      console.log(`Contact IDs: ${memberIds.join(', ')}`);
      const contactsResponse = await axios.get(`${this.apiEndpoint}/contacts/${memberIds.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: this.timeout
      });
      
      if (contactsResponse.status !== 200) {
        throw new Error(`Failed to fetch contact details with status ${contactsResponse.status}: ${JSON.stringify(contactsResponse.data)}`);
      }
      
      if (!contactsResponse.data || !contactsResponse.data.data || !Array.isArray(contactsResponse.data.data)) {
        throw new Error('Invalid response format from Wrike API for contacts');
      }
      
      // Transform the response data into our contact format
      const contacts = contactsResponse.data.data.map((contact: any) => ({
        id: contact.id,
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        type: contact.type || '',
        profiles: contact.profiles ? contact.profiles.map((profile: any) => ({
          email: profile.email,
          avatar_url: profile.avatarUrl,
          timezone: profile.timezone,
          locale: profile.locale
        })) : undefined,
        title: contact.title,
        company_name: contact.companyName,
        phone: contact.phone,
        location: contact.location,
        is_deleted: contact.deleted,
        me: contact.me
      }));
      
      console.log(`Successfully transformed ${contacts.length} contacts`);
      return contacts;
    } catch (error) {
      console.error('Error in fetchContacts:', error instanceof Error ? error.message : JSON.stringify(error));
      throw new Error(`Error fetching contacts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetches tasks for a project from Wrike API
   * @param projectId The Project ID
   * @returns Array of WrikeTask objects
   */
  async fetchTasks(projectId: string): Promise<WrikeTask[]> {
    try {
      console.log(`Fetching tasks for project ID: ${projectId}`);
      const response = await axios.get(`${this.apiEndpoint}/folders/${encodeURIComponent(projectId)}/tasks`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        params: {
          descendants: true,
          subTasks: true
        },
        timeout: this.timeout
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch tasks with status ${response.status}: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        throw new Error('Invalid response format from Wrike API for tasks');
      }
      
      // Transform the response data into our task format
      console.log(`Transforming ${response.data.data.length} tasks`);
      const tasks = response.data.data.map((task: any) => ({
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
      }));
      
      console.log(`Successfully transformed ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      console.error('Error in fetchTasks:', error);
      throw new Error(`Error fetching tasks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}