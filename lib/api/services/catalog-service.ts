import { CatalogClient } from '../clients/catalog-client';
import {
  Role,
  UserStatus,
  Zone,
} from '../types';

// Create a singleton instance of CatalogClient
const catalogClient = new CatalogClient();

export class CatalogService {
  /**
   * Get all roles
   */
  static async getRoles(): Promise<{ roles: Role[] }> {
    const response = await catalogClient.getRoles();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch roles');
    }

    return response.data;
  }

  /**
   * Get all user statuses
   */
  static async getUserStatuses(): Promise<{ statuses: UserStatus[] }> {
    const response = await catalogClient.getUserStatuses();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch user statuses');
    }

    return response.data;
  }

  /**
   * Get all access zones
   */
  static async getAccessZones(): Promise<{ zones: Zone[] }> {
    const response = await catalogClient.getAccessZones();
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch access zones');
    }

    return response.data;
  }
} 