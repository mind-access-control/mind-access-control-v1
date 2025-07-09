// Constants for the Mind Access Control System

// ============================================================================
// EDGE FUNCTIONS
// ============================================================================

export const EDGE_FUNCTIONS = {
  // User management
  EF_USERS: '/functions/v1/ef-users',
  GET_USER_ROLES: '/functions/v1/get-user-roles',
  GET_USER_STATUSES: '/functions/v1/get-user-statuses',
  GET_USER_ROLE_BY_ID: '/functions/v1/get-user-role-by-id',

  // Zone management
  EF_ZONES: '/functions/v1/ef-zones',
  GET_ACCESS_ZONES: '/functions/v1/get-access-zones',

  // Camera management
  EF_CAMERAS: '/functions/v1/ef-cameras',

  // Observed users
  GET_OBSERVED_USERS: '/functions/v1/get-observed-users',
  GET_OBSERVED_USER_LOGS: '/functions/v1/get-observed-user-logs',
  MANAGE_OBSERVED_USER_ACTIONS: '/functions/v1/manage-observed-user-actions',
  REGISTER_NEW_USER: '/functions/v1/register-new-user',

  // Face recognition
  UPLOAD_FACE_IMAGE: '/functions/v1/upload-face-image',
  VALIDATE_USER_FACE: '/functions/v1/validate-user-face',
} as const;

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

/**
 * Email validation regex pattern
 * Validates standard email format with support for:
 * - Local part: letters, numbers, dots, hyphens, underscores
 * - Domain: letters, numbers, hyphens, dots
 * - TLD: 2 or more letters
 */
export const EMAIL_REGEX =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Base URLs for different environments
export const getBaseUrl = () => {
  // Server-side: use environment variable or default to local
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
};

// Helper function to build edge function URLs
export const buildEdgeFunctionUrl = (functionPath: string, params?: Record<string, string>) => {
  const baseUrl = getBaseUrl();
  const url = new URL(functionPath, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
};

// Authentication constants
export const AUTH = {
  ADMIN_ROLE: 'admin',
  DEFAULT_ADMIN_EMAIL: 'admin@mindaccess.com',
  DEFAULT_ADMIN_PASSWORD: 'admin123',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  ACCESS_DENIED: 'Access Denied: Only administrators are allowed to log in.',
  AUTH_DATA_MISSING: 'Authentication data missing after login.',
  ROLE_VERIFICATION_FAILED: 'Failed to verify user role:',
  UNEXPECTED_ERROR: 'An unexpected error occurred during role verification.',
} as const;
