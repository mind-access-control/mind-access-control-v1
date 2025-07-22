import { EMAIL_REGEX, EMPTY_STRING } from '../constants';
import { ValidationError as ValidationErrorType } from './types';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export class ValidationErrorClass extends Error {
  public errors: ValidationErrorType[];
  public statusCode: number = 400;

  constructor(message: string, errors: ValidationErrorType[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any, data: T) => string | null;
  transform?: (value: any) => any;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateField<T>(value: any, field: keyof T, rules: ValidationRule<T>[], data: T): { value: any; errors: ValidationErrorType[] } {
  const rule = rules.find((r) => r.field === field);
  if (!rule) return { value, errors: [] };

  const errors: ValidationErrorType[] = [];

  // Required check
  if (rule.required && (value === undefined || value === null || value === EMPTY_STRING)) {
    errors.push({
      field: String(field),
      message: `${String(field)} is required`,
      value,
    });
    return { value, errors };
  }

  // Skip further validation if value is empty and not required
  if (value === undefined || value === null || value === EMPTY_STRING) {
    return { value, errors };
  }

  // Type check
  if (rule.type) {
    const typeError = validateType(value, rule.type, field);
    if (typeError) {
      errors.push(typeError);
      return { value, errors };
    }
  }

  // Length checks
  if (typeof value === 'string' || Array.isArray(value)) {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push({
        field: String(field),
        message: `${String(field)} must be at least ${rule.minLength} characters`,
        value,
      });
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push({
        field: String(field),
        message: `${String(field)} must be no more than ${rule.maxLength} characters`,
        value,
      });
    }
  }

  // Numeric range checks
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      errors.push({
        field: String(field),
        message: `${String(field)} must be at least ${rule.min}`,
        value,
      });
    }

    if (rule.max !== undefined && value > rule.max) {
      errors.push({
        field: String(field),
        message: `${String(field)} must be no more than ${rule.max}`,
        value,
      });
    }
  }

  // Pattern check
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    errors.push({
      field: String(field),
      message: `${String(field)} format is invalid`,
      value,
    });
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value, data);
    if (customError) {
      errors.push({
        field: String(field),
        message: customError,
        value,
      });
    }
  }

  // Transform value if needed
  const transformedValue = rule.transform ? rule.transform(value) : value;

  return { value: transformedValue, errors };
}

function validateType(value: any, type: string, field: keyof any): ValidationErrorType | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return {
          field: String(field),
          message: `${String(field)} must be a string`,
          value,
        };
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return {
          field: String(field),
          message: `${String(field)} must be a number`,
          value,
        };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          field: String(field),
          message: `${String(field)} must be a boolean`,
          value,
        };
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return {
          field: String(field),
          message: `${String(field)} must be an array`,
          value,
        };
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
          field: String(field),
          message: `${String(field)} must be an object`,
          value,
        };
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return {
          field: String(field),
          message: `${String(field)} must be a valid email address`,
          value,
        };
      }
      break;

    case 'uuid':
      if (typeof value !== 'string' || !isValidUUID(value)) {
        return {
          field: String(field),
          message: `${String(field)} must be a valid UUID`,
          value,
        };
      }
      break;
  }

  return null;
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const userValidationRules: ValidationRule<any>[] = [
  {
    field: 'fullName',
    required: true,
    type: 'string',
    minLength: 2,
    maxLength: 100,
  },
  {
    field: 'email',
    required: true,
    type: 'email',
    maxLength: 255,
  },
  {
    field: 'roleName',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50,
  },
  {
    field: 'statusName',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50,
  },
  {
    field: 'accessZoneIds',
    required: true,
    type: 'array',
    custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return 'Debes seleccionar al menos una zona de acceso';
      }
      if (!value.every((zone) => typeof zone === 'string' && zone.length > 0)) {
        return 'Todos los IDs de zona deben ser strings válidos';
      }
      return null;
    },
  },
  {
    field: 'faceEmbedding',
    type: 'array',
    custom: (value) => {
      if (value !== undefined && value !== null) {
        if (!Array.isArray(value) || value.length !== 128) {
          return 'Face embedding must be an array of exactly 128 numbers';
        }
        if (!value.every((num) => typeof num === 'number' && !isNaN(num))) {
          return 'Face embedding must contain only valid numbers';
        }
      }
      return null;
    },
  },
  {
    field: 'profilePictureUrl',
    type: 'string',
    maxLength: 500,
    custom: (value) => {
      if (value && typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          return 'Profile picture URL must be a valid URL';
        }
      }
      return null;
    },
  },
  {
    field: 'observedUserId',
    type: 'string',
    required: false,
    maxLength: 100,
    custom: (value) => {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        return 'observedUserId must be a string or empty';
      }
      return null;
    },
  },
];

export const faceValidationRules: ValidationRule<any>[] = [
  {
    field: 'faceEmbedding',
    required: true,
    type: 'array',
    custom: (value) => {
      if (!Array.isArray(value) || value.length !== 128) {
        return 'Face embedding must be an array of exactly 128 numbers';
      }
      if (!value.every((num) => typeof num === 'number' && !isNaN(num))) {
        return 'Face embedding must contain only valid numbers';
      }
      return null;
    },
  },
  {
    field: 'zoneId',
    type: 'uuid',
  },
  {
    field: 'cameraId',
    type: 'uuid',
  },
  {
    field: 'confidenceThreshold',
    type: 'number',
    min: 0,
    max: 1,
  },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateUser(data: any): { data: any; errors: ValidationErrorType[] } {
  const errors: ValidationErrorType[] = [];
  const validatedData: any = {};

  for (const rule of userValidationRules) {
    const { value, errors: fieldErrors } = validateField(data[rule.field], rule.field, [rule], data);

    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors);
    } else {
      validatedData[rule.field] = value;
    }
  }

  return { data: validatedData, errors };
}

export function validateFaceRequest(data: any): { data: any; errors: ValidationErrorType[] } {
  const errors: ValidationErrorType[] = [];
  const validatedData: any = {};

  for (const rule of faceValidationRules) {
    const { value, errors: fieldErrors } = validateField(data[rule.field], rule.field, [rule], data);

    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors);
    } else {
      validatedData[rule.field] = value;
    }
  }

  return { data: validatedData, errors };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, EMPTY_STRING);
}

export function validatePagination(params: any): { page: number; limit: number } {
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 10));

  return { page, limit };
}

export function validateSorting(sortBy: string, sortOrder: string): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const validSortFields = ['name', 'email', 'role', 'status', 'created_at'];
  const validSortOrders = ['asc', 'desc'];

  const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const validatedSortOrder = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

  return { sortBy: validatedSortBy, sortOrder: validatedSortOrder as 'asc' | 'desc' };
}
