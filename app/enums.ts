export enum UploadStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum LogDecision {
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  ERROR = 'error',
  UNKNOWN = 'unknown',
  ALLOWED = 'allowed',
}

export enum UserType {
  REGISTERED = 'registered',
  OBSERVED = 'observed',
  NEW_OBSERVED = 'new_observed',
  UNKNOWN = 'unknown',
}

export enum RiskStatus {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
}

export enum CaptureMode {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
}