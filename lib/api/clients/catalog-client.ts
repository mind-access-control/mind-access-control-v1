import { BaseApiClient } from './base-client';
import { ApiResponse } from '../types';
import { EDGE_FUNCTIONS } from '@/lib/constants';

export class CatalogClient extends BaseApiClient {
  /**
   * Get all roles
   */
  async getRoles(): Promise<ApiResponse<{ roles: any[] }>> {
    return this.makeRequest(EDGE_FUNCTIONS.GET_USER_ROLES, {
      method: 'GET',
    });
  }

  /**
   * Get all user statuses
   */
  async getUserStatuses(): Promise<ApiResponse<{ statuses: any[] }>> {
    return this.makeRequest(EDGE_FUNCTIONS.GET_USER_STATUSES, {
      method: 'GET',
    });
  }

  /**
   * Get all access zones
   */
  async getAccessZones(): Promise<ApiResponse<{ zones: any[] }>> {
    return this.makeRequest(EDGE_FUNCTIONS.GET_ACCESS_ZONES, {
      method: 'GET',
    });
  }
} 