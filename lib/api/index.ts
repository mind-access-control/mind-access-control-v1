// ============================================================================
// API LAYER EXPORTS
// ============================================================================

// Types
export * from './types';

// Validation
export {
  faceValidationRules,
  sanitizeInput,
  userValidationRules,
  validateFaceRequest,
  validatePagination,
  validateSorting,
  validateUser,
  ValidationErrorClass,
} from './validation';
export type { ValidationRule } from './validation';

// Services
export { CatalogService, UploadService, UserService } from './services';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

// Common types for easy access
export type { ApiError, ApiResponse, CreateUserRequest, DeleteUserRequest, Role, UpdateUserRequest, User, UserStatus, ValidationError, Zone } from './types';
