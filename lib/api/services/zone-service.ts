import { ZoneClient } from '../clients/zone-client';
import { Zone } from '../types';

export interface CreateZoneRequest {
  name: string;
  category?: string;
  access_level?: number;
}

export interface UpdateZoneRequest {
  name?: string;
  category?: string;
  access_level?: number;
}

export interface ZoneResponse {
  success: boolean;
  data?: Zone | Zone[];
  error?: string;
  message?: string;
}

// Create a singleton instance of ZoneClient
const zoneClient = new ZoneClient();

export class ZoneService {
  /**
   * Get all zones
   */
  static async getZones(): Promise<Zone[]> {
    const response = await zoneClient.getZones();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch zones');
    }
    
    // Extract the zones array from the response
    let zonesData: Zone[] = [];
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      zonesData = response.data.data as Zone[];
    } else if (Array.isArray(response.data)) {
      zonesData = response.data as Zone[];
    } else {
      throw new Error('Invalid response structure');
    }
    
    return zonesData;
  }

  /**
   * Get a specific zone by ID
   */
  static async getZone(id: string): Promise<Zone> {
    const response = await zoneClient.getZone(id);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch zone');
    }
    return response.data;
  }

  /**
   * Create a new zone
   */
  static async createZone(request: CreateZoneRequest): Promise<Zone> {
    const response = await zoneClient.createZone(request);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create zone');
    }
    return response.data;
  }

  /**
   * Update an existing zone
   */
  static async updateZone(id: string, request: UpdateZoneRequest): Promise<Zone> {
    const response = await zoneClient.updateZone(id, request);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update zone');
    }
    return response.data;
  }

  /**
   * Delete a zone
   */
  static async deleteZone(id: string): Promise<void> {
    const response = await zoneClient.deleteZone(id);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete zone');
    }
  }

  /**
   * Validate zone name
   */
  static validateZoneName(name: string): string | null {
    if (!name || typeof name !== 'string') {
      return 'Zone name is required and must be a string';
    }
    if (name.trim().length === 0) {
      return 'Zone name cannot be empty';
    }
    if (name.length > 100) {
      return 'Zone name must be 100 characters or less';
    }
    return null;
  }

  /**
   * Validate access level
   */
  static validateAccessLevel(accessLevel?: number): string | null {
    if (accessLevel !== undefined && (typeof accessLevel !== 'number' || accessLevel < 0)) {
      return 'Access level must be a non-negative number';
    }
    return null;
  }

  /**
   * Validate category
   */
  static validateCategory(category?: string): string | null {
    if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
      return 'Category must be a non-empty string';
    }
    if (category && category.length > 50) {
      return 'Category must be 50 characters or less';
    }
    return null;
  }

  /**
   * Validate create zone request
   */
  static validateCreateRequest(request: CreateZoneRequest): string | null {
    const nameError = this.validateZoneName(request.name);
    if (nameError) return nameError;

    const categoryError = this.validateCategory(request.category);
    if (categoryError) return categoryError;

    const accessLevelError = this.validateAccessLevel(request.access_level);
    if (accessLevelError) return accessLevelError;

    return null;
  }

  /**
   * Validate update zone request
   */
  static validateUpdateRequest(request: UpdateZoneRequest): string | null {
    if (request.name !== undefined) {
      const nameError = this.validateZoneName(request.name);
      if (nameError) return nameError;
    }

    if (request.category !== undefined) {
      const categoryError = this.validateCategory(request.category);
      if (categoryError) return categoryError;
    }

    if (request.access_level !== undefined) {
      const accessLevelError = this.validateAccessLevel(request.access_level);
      if (accessLevelError) return accessLevelError;
    }

    return null;
  }
}
