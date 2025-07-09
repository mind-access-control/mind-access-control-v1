import { UserClient } from '../clients/user-client';
import { CreateUserRequest, DeleteUserRequest, UpdateUserRequest, User, UserListRequest, UserListResponse } from '../types';
import { extractObjectData } from '../utils';
import { validatePagination, validateSorting, validateUser, ValidationErrorClass } from '../validation';

// Create a singleton instance of UserClient
const userClient = new UserClient();

export class UserService {
  /**
   * Create a new user with validation
   */
  static async createUser(request: CreateUserRequest): Promise<{ userId: string }> {
    // Validate request
    const { data, errors } = validateUser(request);
    if (errors.length > 0) {
      throw new ValidationErrorClass('Validation failed', errors);
    }

    // Make API call
    const response = await userClient.createUser(data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create user');
    }

    return extractObjectData<{ userId: string }>(response);
  }

  /**
   * Update an existing user
   */
  static async updateUser(request: UpdateUserRequest): Promise<{ message: string }> {
    if (!request.userId) {
      throw new ValidationErrorClass('User ID is required', [{ field: 'userId', message: 'User ID is required' }]);
    }

    const response = await userClient.updateUser(request);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update user');
    }

    return extractObjectData<{ message: string }>(response);
  }

  /**
   * Delete a user
   */
  static async deleteUser(request: DeleteUserRequest): Promise<{ message: string }> {
    if (!request.userId) {
      throw new ValidationErrorClass('User ID is required', [{ field: 'userId', message: 'User ID is required' }]);
    }

    const response = await userClient.deleteUser(request);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete user');
    }

    return extractObjectData<{ message: string }>(response);
  }

  /**
   * Get users with pagination and filtering
   */
  static async getUsers(request: UserListRequest = {}): Promise<UserListResponse> {
    // Validate pagination and sorting
    const { page, limit } = validatePagination(request);
    const { sortBy, sortOrder } = validateSorting(request.sortBy || 'created_at', request.sortOrder || 'desc');

    const validatedRequest = {
      ...request,
      page,
      limit,
      sortBy: sortBy as 'name' | 'email' | 'role' | 'status' | 'created_at',
      sortOrder,
    };

    const response = await userClient.getUsers(validatedRequest);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch users');
    }

    return response.data;
  }

  /**
   * Get a single user by ID
   */
  static async getUserById(userId: string): Promise<User> {
    if (!userId) {
      throw new ValidationErrorClass('User ID is required', [{ field: 'userId', message: 'User ID is required' }]);
    }

    const response = await userClient.getUserById(userId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user');
    }

    return extractObjectData<User>(response);
  }

  /**
   * Get a single user role by ID
   */
  static async getUserRoleById(userId: string): Promise<{ role_name: string }> {
    if (!userId) {
      throw new ValidationErrorClass('User ID is required', [{ field: 'userId', message: 'User ID is required' }]);
    }

    const response = await userClient.getUserRoleById(userId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user role');
    }

    return extractObjectData<{ role_name: string }>(response);
  }
}
