// API Types for Edge Functions
// This file contains all the TypeScript interfaces for requests and responses

import { RiskStatus } from "@/app/enums";

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

export type User = {
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
};

export type UserSortField = 'name' | 'email' | 'role';

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

export type Role = {
  id: string;
  name: string;  
};

// ============================================================================
// USER STATUS TYPES
// ============================================================================

export type UserStatus = {
  id: string;
  name: string;
  description?: string;
};

// ============================================================================
// ZONE MANAGEMENT TYPES
// ============================================================================

export type Zone = {
  id: string;
  name: string;
  category?: string;
  access_level?: number;
};

// ============================================================================
// CAMERA MANAGEMENT TYPES
// ============================================================================

export type Camera = {
  id?: string | null;
  name: string;
  zone_id?: string;
  location?: string;
  zone?: Zone | null;
};

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

// ============================================================================
// ACCESS LOGS TYPES
// ============================================================================

export type UserForFilter = { 
  id: string; 
  full_name: string; 
};

// Main log type from database
export type Log = {
  id: string; // Log ID (UUID)
  timestamp: string;
  user_id?: string | null; // Registered user ID
  observed_user_id?: string | null; // Observed user ID
  camera_id?: string | null;
  result: boolean; // Access granted/denied
  user_type?: 'registered' | 'observed' | 'new_observed' | 'unknown' | null;
  match_status?: string | null;
  decision: 'unknown' | 'access_granted' | 'access_denied' | 'error';
  reason?: string;
  confidence_score?: number | null;
  requested_zone_id?: string | null;
  users: {
    full_name: string;
    role_id: string;
    status_id: string;
    profile_picture_url: string | null;
  } | null;
  zones: {
    name: string;
  } | null;
};

// Joined Log type for display in frontend
export type DisplayLog = {
  id: string;
  timestamp: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  userStatus: string;
  zoneName: string;
  status: string;
  profilePictureUrl: string | null;
};

// Summary entry type for user access summary
export type SummaryEntry = {
  user: string;
  email: string;
  firstAccess: string;
  lastAccess: string;
  totalAccesses: number;
  successful: number;
  failed: number;
  successRate: number;
  zoneAccesses: Record<string, number>;
};

// Types for sorting and filtering
export type LogSortField = 'timestamp' | 'userName' | 'zoneName' | 'status';
export type SummarySortField = 'user' | 'email' | 'firstAccess' | 'lastAccess' | 'totalAccesses' | 'successRate';

// Type for table columns
export type Column = {
  key: string;
  label: string;
  sortable: boolean;
}; 

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export type LogData = {
  timestamp: string;
  decision: 'access_granted' | 'access_denied' | 'error' | 'unknown';
  reason: string | null;
  match_status: string | null;
  user_id?: string | null; // ID de usuario registrado
  observed_user_id?: string | null; // ID de usuario observado
  user_type?: 'registered' | 'observed' | 'new_observed' | 'unknown' | null;
};

// Tipo para los datos de tendencia diarios
export type DailyTrendEntry = {
  name: string; // Será el nombre corto del día (Mon, Tue, etc.)
  dateKey: string; // Será la fecha completa UTC (YYYY-MM-DD) para orden y referencia
  success: number;
  failed: number;
};

// ============================================================================
// OVERVIEW TAB TYPES
// ============================================================================


// Tipo para los datos de KPI
export interface KpiData {
  totalUsers: number;
  activeZones: number;
  accessesToday: number;
  activeAlerts: number;
  anomalousAttempts: number;
  successRate: number;
}

// Tipo para el Risk Score
export interface RiskScore {
  score: number;
  status: RiskStatus;
}

export interface SuspiciousUser {
  id: string;
  name: string;
  reason: string;
  details?: any;
  photoUrl?: string | null;
}

// Tipo para las entradas del mapa de usuarios sospechosos (uso interno, incluye 'count')
export interface SuspiciousUserMapEntry {
  id: string; // Puede ser user_id o observed_user_id
  name: string; // Nombre completo o ID si no se encuentra
  reason: string;
  details?: any;
  count: number; // Propiedad 'count' es requerida aquí para la lógica de agrupación
  photoUrl?: string | null; // URL de la foto de perfil
}

// ¡CAMBIO CLAVE! Nuevo tipo para los usuarios sospechosos que se mostrarán (NO incluye 'count')
export interface SuspiciousUserForDisplay {
  id: string;
  name: string;
  reason: string;
  details?: any;
  photoUrl?: string | null;
}

// Tipo para las recomendaciones de IA
export interface AIRecommendation {
  id: string;
  action: string;
  details: string;
}

// ============================================================================
// OBSERVED USERS TYPES
// ============================================================================

// Interfaz para la respuesta completa de la Edge Function (alineada con get-observed-users EF)
export interface ObservedUsersResponse {
  users: ObservedUser[];
  totalCount: number; // Conteo para la tabla (puede ser filtrado)
  absoluteTotalCount: number; // NUEVO: Conteo total real sin aplicar filtros
  pendingReviewCount: number;
  highRiskCount: number;
  activeTemporalCount: number;
  expiredCount: number;
}

// Define a common interface for objects with ID and Name (like zones and statuses)
export interface ItemWithNameAndId {
  id: string;
  name: string;
}

// Define the type for an observed user for the frontend
// THIS IS THE SINGLE SOURCE OF TRUTH FOR THIS INTERFACE
export interface ObservedUser {
  id: string;
  firstSeen: string;
  lastSeen: string;
  tempAccesses: number;
  accessedZones: ItemWithNameAndId[]; // Array de objetos {id, name}
  status: ItemWithNameAndId; // Objeto {id, name}
  aiAction: string | null; // <-- DEBE SER string | null
  confidence: number;
  faceImage: string | null;
}

// Tipos para el ordenamiento de la tabla
export type ObservedUserSortField =
  | "id"
  | "firstSeen"
  | "lastSeen"
  | "tempAccesses"
  | "accessedZones"
  | "status"
  | "aiAction";

// ============================================================================
// OBSERVED USERS LOGS TYPES
// ============================================================================
export interface ObservedLog {
  id: string; // Log ID
  timestamp: string;
  observedUserId: string; // Observed user ID
  faceImageUrl: string | null; // URL of the last photo of the observed user
  zone: ItemWithNameAndId; // {id, name} object
  status: ItemWithNameAndId; // {id, name} object
  aiAction: string | null; // AI suggested action
  isRegistered: boolean; // Indicates if the observed user is registered
}
// Type for table sort fields, now including 'isRegistered'
export type ObservedLogSortField =
| "timestamp"
| "observedUserId"
| "zone"
| "status"
| "isRegistered";