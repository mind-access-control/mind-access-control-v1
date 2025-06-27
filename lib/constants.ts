// Constants for the Mind Access Control System

// Supabase Edge Function URLs
export const EDGE_FUNCTIONS = {
  GET_USER_ROLE_BY_ID: '/functions/v1/get-user-role-by-id',
  GET_ACCESS_ZONES: '/functions/v1/get-access-zones',
  GET_USER_ROLES: '/functions/v1/get-user-roles',
  GET_USER_STATUSES: '/functions/v1/get-user-statuses',
  REGISTER_NEW_USER: '/functions/v1/register-new-user',
  VALIDATE_USER_FACE: '/functions/v1/validate-user-face',  
  EF_USERS: '/functions/v1/ef-users',
} as const;

// Base URLs for different environments
export const getBaseUrl = () => {
  /*if (typeof window !== 'undefined') {
    // Client-side: use the same origin
    return window.location.origin;
  }*/
  
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