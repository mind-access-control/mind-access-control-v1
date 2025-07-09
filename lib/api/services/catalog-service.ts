import { CatalogClient } from '../clients/catalog-client';
import { Role, UserStatus, Zone } from '../types';
import { extractArrayData } from '../utils';

// Create a singleton instance of CatalogClient
const catalogClient = new CatalogClient();

export class CatalogService {
  /**
   * Get all roles
   */
  static async getRoles(): Promise<Role[]> {
    const response = await catalogClient.getRoles();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch roles');
    }
    return extractArrayData<Role>(response, 'roles');
  }

  /**
   * Get all user statuses
   */
  static async getUserStatuses(): Promise<UserStatus[]> {
    const response = await catalogClient.getUserStatuses();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user statuses');
    }
    return extractArrayData<UserStatus>(response, 'statuses');
  }

  /**
   * Get all access zones
   */
  static async getAccessZones(): Promise<Zone[]> {
    const response = await catalogClient.getAccessZones();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch access zones');
    }
    return extractArrayData<Zone>(response, 'zones');
  }
}
