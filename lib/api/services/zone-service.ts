import { ZoneClient } from '@/lib/api/clients/zone-client';
import { CreateZoneRequest, UpdateZoneRequest, Zone } from '@/lib/api/types';
import { extractArrayData, extractObjectData } from '@/lib/api/utils';

// Create a singleton instance of ZoneClient
const zoneClient = new ZoneClient();

export class ZoneService {
  /**
   * Get all zones
   * @returns The zones
   */
  static async getZones(): Promise<Zone[]> {
    const response = await zoneClient.getZones();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch zones');
    }
    return extractArrayData<Zone>(response);
  }

  /**
   * Get a specific zone by ID
   * @param id - The ID of the zone to fetch
   * @returns The zone
   */
  static async getZone(id: string): Promise<Zone> {
    const response = await zoneClient.getZone(id);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch zone');
    }
    return extractObjectData<Zone>(response);
  }

  /**
   * Create a new zone
   * @param request - The request object containing the zone data
   * @returns The created zone
   */
  static async createZone(request: CreateZoneRequest): Promise<Zone> {
    const response = await zoneClient.createZone(request);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create zone');
    }
    return extractObjectData<Zone>(response);
  }

  /**
   * Update an existing zone
   * @param id - The ID of the zone to update
   * @param request - The request object containing the zone data
   * @returns The updated zone
   */
  static async updateZone(id: string, request: UpdateZoneRequest): Promise<Zone> {
    const response = await zoneClient.updateZone(id, request);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update zone');
    }
    return extractObjectData<Zone>(response);
  }

  /**
   * Delete a zone
   * @param id - The ID of the zone to delete
   * @returns The deleted zone
   */
  static async deleteZone(id: string): Promise<void> {
    const response = await zoneClient.deleteZone(id);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete zone');
    }
  }

  /**
   * Validate zone name
   * @param name - The name of the zone to validate
   * @returns The error message if the zone name is invalid, otherwise null
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
   * @param accessLevel - The access level to validate
   * @returns The error message if the access level is invalid, otherwise null
   */
  static validateAccessLevel(accessLevel?: number): string | null {
    if (accessLevel !== undefined && (typeof accessLevel !== 'number' || accessLevel < 0)) {
      return 'Access level must be a non-negative number';
    }
    return null;
  }

  /**
   * Validate category
   * @param category - The category to validate
   * @returns The error message if the category is invalid, otherwise null
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
   * @param request - The request object containing the zone data
   * @returns The error message if the request is invalid, otherwise null
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
   * @param request - The request object containing the zone data
   * @returns The error message if the request is invalid, otherwise null
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
