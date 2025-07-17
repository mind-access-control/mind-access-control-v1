import { BaseApiClient } from './base-client';
import { ApiResponse, ObservedUser, ObservedUserActionRequest, ObservedUserRequest } from '../types';
import { EDGE_FUNCTIONS } from '@/lib/constants';

export class ObservedUserClient extends BaseApiClient {
  /**
   * Get the observed users
   * @returns The observed users
   */
  async getObservedUsers(request: ObservedUserRequest): Promise<ApiResponse<ObservedUser[]>> {
    const params: Record<string, string> = {};
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = String(value);
      }
    });
    return this.makeRequest(EDGE_FUNCTIONS.GET_OBSERVED_USERS, { method: 'GET', params });
  }

  /**
   * Manage the observed user action
   * @param request - The request object containing the observed user ID and action type
   * @returns The response from the edge function
   */
  async manageObservedUserAction(request: ObservedUserActionRequest): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(EDGE_FUNCTIONS.MANAGE_OBSERVED_USER_ACTIONS, { method: 'POST', body: request });
  }
}
