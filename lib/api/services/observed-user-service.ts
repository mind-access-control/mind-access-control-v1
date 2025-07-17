import { ObservedUserActionRequest, ObservedUserRequest, ObservedUsersResponse } from '@/lib/api/types';
import { ObservedUserClient } from '@/lib/api/clients/observed-user-client';
import { extractObjectData } from '@/lib/api/utils';

const observedUserClient = new ObservedUserClient();

export class ObservedUserService {
  /**
   * Get the observed users
   * @returns The observed users
   */
  static async getObservedUsers(request: ObservedUserRequest): Promise<ObservedUsersResponse> {
    const response = await observedUserClient.getObservedUsers(request);
    if (!response.success) throw new Error(response.error || 'Failed to fetch observed users');
    return extractObjectData<ObservedUsersResponse>(response);
  }

  /**
   * Manage the observed user action
   * @param request - The request object containing the observed user ID and action type
   * @returns The response from the edge function
   */
  static async manageObservedUserAction(request: ObservedUserActionRequest): Promise<{ message: string }> {
    const response = await observedUserClient.manageObservedUserAction(request);
    if (!response.success) throw new Error(response.error || 'Failed to manage observed user action');
    return extractObjectData<{ message: string }>(response);
  }
}
