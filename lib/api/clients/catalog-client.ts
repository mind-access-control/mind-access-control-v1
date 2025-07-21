import { EDGE_FUNCTIONS } from '@/lib/constants';
import { ApiResponse } from '@/lib/api/types';
import { BaseApiClient } from '@/lib/api/clients/base-client';

export class CatalogClient extends BaseApiClient {
  /**
   * Get all roles  
   * @returns The roles
   */
  async getRoles(): Promise<ApiResponse<{ roles: any[] }>> {
    return this.makeRequest(EDGE_FUNCTIONS.GET_USER_ROLES, {
      method: 'GET',
    });
  }

  /**
   * Get all user statuses
   * @returns The user statuses
   */
  async getUserStatuses(): Promise<ApiResponse<{ statuses: any[] }>> {
    return this.makeRequest(EDGE_FUNCTIONS.GET_USER_STATUSES, {
      method: 'GET',
    });
  }
} 