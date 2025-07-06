import { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Service for accessing specific Wrike API resources
 */
export class WrikeApiResources {
  constructor(private apiGet: <T = any>(path: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>) {}

  /**
   * Fetches projects from a specific space in Wrike
   * 
   * @param spaceId - The ID of the space to fetch projects from
   * @returns A promise that resolves to an array of projects
   */
  async getProjects(spaceId: string): Promise<any[]> {
    try {
      if (!spaceId) {
        throw new Error('Space ID is required');
      }

      // First, get folders in the space that are projects
      const response = await this.apiGet(`/spaces/${spaceId}/folders?project=true`);
      
      if (response.status !== 200 || !response.data || !response.data.data) {
        throw new Error('Failed to fetch projects from Wrike API');
      }

      // Transform the response to a more usable format
      const projects = response.data.data.map((project: any) => {
        return {
          id: project.id,
          title: project.title,
          description: project.description || '',
          created_date: project.createdDate,
          updated_date: project.updatedDate,
          status: project.project?.status || 'Unknown',
          owner_ids: project.ownerIds || [],
          permalink: project.permalink,
          custom_fields: project.customFields || [],
          child_ids: project.childIds || [],
          parent_ids: project.parentIds || [],
          scope: project.scope,
          project_data: project.project || {}
        };
      });

      return projects;
    } catch (error) {
      throw error; // Let the caller handle the error
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
      if (!spaceId) {
        throw new Error('Space ID is required');
      }

      // First, get the space details with members field
      const spaceResponse = await this.apiGet(`/spaces/${spaceId}?fields=[members]`);

      console.log("Space Response:", spaceResponse);
      
      if (spaceResponse.status !== 200 || !spaceResponse.data || !spaceResponse.data.data) {
        throw new Error('Failed to fetch space details from Wrike API');
      }

      // Extract member IDs from the space
      const space = spaceResponse.data.data[0];
      if (!space || !space.members || !Array.isArray(space.members)) {
        return []; // No members found in the space
      }

      const memberIds = space.members;

      if (memberIds.length === 0) {
        return []; // No members to fetch
      }

      // Fetch detailed contact information for each member
      return await this.getContactsByIds(memberIds);
    } catch (error) {
      throw error; // Let the caller handle the error
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
      if (!contactIds || contactIds.length === 0) {
        return [];
      }

      // Join contact IDs with commas for the API request
      const contactIdsParam = contactIds.join(',');
      const response = await this.apiGet(`/contacts/${contactIdsParam}`);
      
      if (response.status !== 200 || !response.data || !response.data.data) {
        throw new Error('Failed to fetch contacts from Wrike API');
      }

      // Transform the response to a more usable format
      return response.data.data.map((contact: any) => ({
        id: contact.id,
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        full_name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email: contact.profiles?.[0]?.email || '',
        timezone: contact.timezone || '',
        locale: contact.locale || '',
        deleted: contact.deleted || false,
        avatar_url: contact.avatarUrl || '',
        role: contact.role || ''
      }));
    } catch (error) {
      throw error; // Let the caller handle the error
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
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Validate project ID format - Wrike IDs typically follow a specific format
      // This regex checks for a string of uppercase letters and numbers
      const validIdRegex = /^[A-Z0-9]+$/;
      if (!validIdRegex.test(projectId)) {
        throw new Error('Invalid project ID format');
      }

      // If validation passes, get tasks in the project
      // This will still fail with a 404 if the ID is valid format but doesn't exist
      const response = await this.apiGet(`/folders/${projectId}/tasks?descendants=true&subTasks=true`);
      
      if (response.status !== 200 || !response.data || !response.data.data) {
        throw new Error(`Failed to fetch tasks from Wrike API for project ${projectId}`);
      }

      // Transform the response to a more usable format
      const tasks = response.data.data.map((task: any) => {
        return {
          id: task.id,
          title: task.title,
          description: task.description || '',
          brief_description: task.briefDescription || '',
          status: task.status || 'Unknown',
          importance: task.importance || 'Normal',
          created_date: task.createdDate,
          updated_date: task.updatedDate,
          completed_date: task.completedDate,
          due_date: task.dueDate,
          parent_ids: task.parentIds || [],
          super_parent_ids: task.superParentIds || [],
          shared_ids: task.sharedIds || [],
          responsible_ids: task.responsibleIds || [],
          author_ids: task.authorIds || [],
          custom_status_id: task.customStatusId,
          custom_fields: task.customFields || [],
          permalink: task.permalink,
          priority: task.priority,
          follow_up_date: task.followUpDate,
          recurrent: task.recurrent || false,
          attachment_count: task.attachmentCount || 0,
          has_attachments: (task.attachmentCount || 0) > 0,
          scope: task.scope,
          effort: task.effort,
          billing_type: task.billingType
        };
      });

      return tasks;
    } catch (error) {
      throw error; // Let the caller handle the error
    }
  }
}