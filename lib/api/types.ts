// API Types for Edge Functions
// This file contains all the TypeScript interfaces for requests and responses

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError extends ApiResponse {
  error: string;
  code?: string;
  details?: ValidationError[];
  statusCode: number;
}

// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // Changed from Role object to string (name)
  status?: string; // Changed from UserStatus object to string (name), made optional
  accessZones: string[]; // Changed from Zone[] to string[] (zone names)
  faceEmbedding?: number[];
  profilePictureUrl?: string;
  accessMethod?: 'facial' | 'card' | 'pin';
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  roleName: string;
  statusName: string;
  accessZoneNames: string[];
  faceEmbedding?: number[];
  profilePictureUrl?: string;
  accessMethod?: 'facial' | 'card' | 'pin';
}

export interface UpdateUserRequest {
  userId?: string;
  fullName?: string;
  email?: string;
  roleName?: string;
  statusName?: string;
  accessZoneNames?: string[];
  faceEmbedding?: number[];
  profilePictureUrl?: string;
}

export interface DeleteUserRequest {
  userId: string;
  force?: boolean;
}

export interface UserListRequest {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  zone?: string;
  sortBy?: 'name' | 'email' | 'role' | 'status' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResponse extends PaginatedResponse<User> {
  filters: {
    applied: Partial<UserListRequest>;
    available: {
      roles: Role[];
      statuses: UserStatus[];
      zones: Zone[];
    };
  };
}

// ============================================================================
// ROLE MANAGEMENT TYPES
// ============================================================================

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// USER STATUS TYPES
// ============================================================================

export interface UserStatus {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ZONE MANAGEMENT TYPES
// ============================================================================

export interface Zone {
  id: string;
  name: string;
  category: string;
  access_level?: number;
}

// ============================================================================
// CAMERA MANAGEMENT TYPES
// ============================================================================

export interface Camera {
  id: string;
  name: string;
  zone_id: string;
  location?: string;
  zone?: { id: string; name: string; category?: string } | null;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  sessionExpiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}