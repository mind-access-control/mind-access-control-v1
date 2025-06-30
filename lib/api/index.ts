// ============================================================================
// API LAYER EXPORTS
// ============================================================================

// Types
export * from './types';

// Client
//export { apiClient, ApiClient } from './client';
//export type { ApiClientConfig, RequestContext, ResponseContext } from './client';

// Validation
export { 
  ValidationErrorClass,
  validateUser,
  validateFaceRequest,
  validatePagination,
  validateSorting,
  sanitizeInput,
  userValidationRules,
  faceValidationRules
} from './validation';
export type { ValidationRule } from './validation';

// Services
export {
  UserService,
  CatalogService,
} from './services';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

// Common types for easy access
export type {
  ApiResponse,
  ApiError,
  ValidationError,
  User,
  Role,
  UserStatus,
  Zone,
  CreateUserRequest,
  UpdateUserRequest,
  DeleteUserRequest,
} from './types'; 