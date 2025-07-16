import { UserClient } from '@/lib/api/clients/user-client';
import { CreateUserRequest, DeleteUserRequest, UpdateUserRequest, User, UserForFilter, UserListRequest, UserListResponse } from '@/lib/api/types';
import { extractArrayData, extractObjectData } from '@/lib/api/utils';
import { validatePagination, validateSorting, validateUser, ValidationErrorClass } from '@/lib/api/validation';

// Create a singleton instance of UserClient
const userClient = new UserClient();

export class UserService {
  /**
   * Create a new user with validation
   * @param request - The request object containing the user data
   * @returns The response object containing the user ID
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
   * @param request - The request object containing the user data
   * @returns The response object containing the message
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
   * @param request - The request object containing the user ID
   * @returns The response object containing the message
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
   * @param request - The request object containing the user data
   * @returns The response object containing the users
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
   * @param userId - The ID of the user to fetch
   * @returns The response object containing the user
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
   * @param userId - The ID of the user to fetch the role for
   * @returns The response object containing the user role
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

  /**
   * Get all users for filter
   * @returns The response object containing the users for filter
   */
  static async getAllUsersForFilter(): Promise<UserForFilter[]> {
    const response = await userClient.getAllUsersForFilter();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch users for filter');
    }
    return extractArrayData<UserForFilter>(response, 'users');
  }
}
