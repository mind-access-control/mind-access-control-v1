// Constants for the Mind Access Control System

import { Column, LogSortField, SummarySortField  } from "./api/types";

// ============================================================================
// GENERIC CONSTANTS
// ============================================================================
export const EMPTY_STRING = '';
export const SELECT_ALL_VALUE = 'all';
export const NA_VALUE = 'N/A';
export const DEFAULT_ZONE_CATEGORY = 'Employee';
export const DEFAULT_USER_STATUS = 'active';

// ============================================================================
// EDGE FUNCTIONS
// ============================================================================

export const EDGE_FUNCTIONS = {  
  // User management
  EF_USERS: '/functions/v1/ef-users',
  GET_USER_ROLES: '/functions/v1/get-user-roles',
  GET_USER_STATUSES: '/functions/v1/get-user-statuses',
  GET_USER_ROLE_BY_ID: '/functions/v1/get-user-role-by-id',
  GET_USER_EMAILS: '/functions/v1/get-user-emails',

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

  // Dashboard
  GENERATE_DASHBOARD_RECOMMENDATIONS: '/functions/v1/generate-dashboard-recommendations',
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

// ============================================================================
// ACCESS LOGS CONSTANTS

// Table column definitions
export const LOG_COLUMNS: Column[] = [
  { key: 'profilePicture', label: 'Photo', sortable: false },
  { key: 'timestamp', label: 'Timestamp', sortable: true },
  { key: 'userName', label: 'User Name', sortable: true },
  { key: 'userEmail', label: 'User Email', sortable: false },
  { key: 'userRole', label: 'User Role', sortable: false },
  { key: 'userStatus', label: 'User Status', sortable: false },
  { key: 'zoneName', label: 'Zone', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

// Pagination options
export const PAGINATION_OPTIONS = [10, 25, 50, 100] as const;

// Status filter options
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'access_granted', label: 'Access Granted' },
  { value: 'access_denied', label: 'Access Denied' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'error', label: 'Error' },
] as const;

// Summary status filter options
export const SUMMARY_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'successful', label: 'Users with Successful Access' },
  { value: 'failed', label: 'Users with Failed Access' },
] as const;

// Default values
export const DEFAULT_LOG_SORT_FIELD: LogSortField = 'timestamp';
export const DEFAULT_LOG_CURRENT_PAGE = 1;
export const DEFAULT_LOG_ITEMS_PER_PAGE = 10;

export const DEFAULT_SUMMARY_SORT_FIELD: SummarySortField = 'user';

// Filter default values
export const DEFAULT_FILTER_VALUES = {
  generalSearchTerm: EMPTY_STRING,
  dateFrom: EMPTY_STRING,
  dateTo: EMPTY_STRING,
  selectedLogUserId: SELECT_ALL_VALUE,
  selectedLogZone: SELECT_ALL_VALUE,
  selectedLogStatus: SELECT_ALL_VALUE,
  summarySearchTerm: EMPTY_STRING,
  summaryStatusFilter: SELECT_ALL_VALUE,
};

// Success rate thresholds for badge styling
export const SUCCESS_RATE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

// Image fallback URLs
export const IMAGE_FALLBACKS = {
  PROFILE_PICTURE: 'https://placehold.co/40x40/cccccc/ffffff?text=N/A',
  PROFILE_PICTURE_LARGE: 'https://placehold.co/400x400/cccccc/ffffff?text=Image+Not+Available',
} as const;