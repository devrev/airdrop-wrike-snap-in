import axios from 'axios';

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
  private readonly timeout: number = 10000;

  /**
   * Creates a new instance of the WrikeApiClient
   * @param apiKey The Wrike API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetches members of a space
   * @param spaceId The ID of the space
   * @returns An array of member IDs
   */
  async fetchSpaceMembers(spaceId: string): Promise<string[]> {
    const response = await axios.get(`${this.apiEndpoint}/spaces/${spaceId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      params: {
        fields: '[members]'
      },
      timeout: this.timeout
    });

    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(`Failed to fetch space members with status ${response.status}`);
    }
    
    // Process the response data
    if (!response.data || !response.data.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
      throw new Error('Invalid response format from Wrike API for space members');
    }

    // Extract member IDs from the space response
    const spaceData = response.data.data[0]; // Get the first (and should be only) space
    
    if (!spaceData.members || !Array.isArray(spaceData.members)) {
      return [];
    }
    
    return spaceData.members.map((member: any) => member.id);
  }

  /**
   * Fetches contact details for a list of member IDs
   * @param memberIds Array of member IDs
   * @returns Array of WrikeContact objects
   */
  async fetchContactDetails(memberIds: string[]): Promise<WrikeContact[]> {
    if (memberIds.length === 0) {
      return [];
    }

    const response = await axios.get(`${this.apiEndpoint}/contacts/${memberIds.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      timeout: this.timeout
    });

    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error(`Failed to fetch contact details with status ${response.status}`);
    }
    
    // Process the response data
    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid response format from Wrike API for contacts');
    }
    
    // Transform the response data into our contact format
    return response.data.data.map((contact: any) => this.transformContactData(contact));
  }

  /**
   * Transforms raw contact data from the API into our WrikeContact format
   * @param contact Raw contact data from the API
   * @returns Transformed WrikeContact object
   */
  private transformContactData(contact: any): WrikeContact {
    return {
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
    };
  }
}