import { CatalogClient } from '@/lib/api/clients/catalog-client';
import { Role, UserStatus, Zone } from '@/lib/api/types';
import { extractArrayData } from '@/lib/api/utils';

// Create a singleton instance of CatalogClient
const catalogClient = new CatalogClient();

export class CatalogService {
  /**
   * Get all roles
   * @returns The roles
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
   * @returns The user statuses
   */
  static async getUserStatuses(): Promise<UserStatus[]> {
    const response = await catalogClient.getUserStatuses();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user statuses');
    }
    return extractArrayData<UserStatus>(response, 'statuses');
  }
}
