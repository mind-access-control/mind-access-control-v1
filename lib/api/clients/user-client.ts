import { BaseApiClient } from './base-client';
import { ApiResponse, Role } from '../types';
import {
  CreateUserRequest,
  UpdateUserRequest,
  DeleteUserRequest,
  UserListRequest,
  UserListResponse,
  User,
} from '../types';
import { EDGE_FUNCTIONS, EMPTY_STRING } from '@/lib/constants';

export class UserClient extends BaseApiClient {
  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest): Promise<ApiResponse<{ userId: string }>> {
    return this.makeRequest(EDGE_FUNCTIONS.REGISTER_NEW_USER, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Update an existing user
   */
  async updateUser(request: UpdateUserRequest): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_USERS, {
      method: 'PUT',
      body: request,
      params: { id: request.userId || EMPTY_STRING },
    });
  }

  /**
   * Delete a user
   */
  async deleteUser(request: DeleteUserRequest): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_USERS, {
      method: 'DELETE',
      params: { id: request.userId },
    });
  }

  /**
   * Get users with pagination and filtering
   */
  async getUsers(request: UserListRequest = {}): Promise<ApiResponse<UserListResponse>> {
    const params: Record<string, string> = {};
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = String(value);
      }
    });

    return this.makeRequest(EDGE_FUNCTIONS.EF_USERS, {
      method: 'GET',
      params,
    });
  }

  /**
   * Get a single user by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_USERS, {
      method: 'GET',
      params: { id: userId },
    });
  }

  /**
   * Get a single user by ID
   */
  async getUserRoleById(userId: string): Promise<ApiResponse<{ role_name: string }>> {
    return this.makeRequest(EDGE_FUNCTIONS.GET_USER_ROLE_BY_ID, {
      method: 'GET',
      params: { userId: userId },
    });
  }
} 