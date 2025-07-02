// Type definitions for the Mind Access Control System

// Logging and access types
export type Log = {
  id: number;
  timestamp: string;
  user: string;
  email: string;
  role: string;
  zone: string;
  status: string;
  method: string;
};

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

// Sorting types
export type SortField = 'name' | 'email' | 'role';
export type SortDirection = 'asc' | 'desc';
export type LogSortField = 'timestamp' | 'user' | 'email' | 'role' | 'zone' | 'method' | 'status';
export type SummarySortField = 'user' | 'email' | 'firstAccess' | 'lastAccess' | 'totalAccesses' | 'successRate';
export type ObservedUserSortField = 'id' | 'firstSeen' | 'lastSeen' | 'tempAccesses' | 'accessedZones' | 'status' | 'aiAction';

// UI component types
export type Column = {
  key: string;
  label: string;
  sortable: boolean;
};

// Security and monitoring types
export type SuspiciousUser = {
  id: string;
  name: string;
  riskScore: number;
  status: 'low' | 'moderate' | 'high';
  lastSeen: string;
  location: string;
  attempts: number;
  faceImage: string;
};

export type AIRecommendation = {
  id: string;
  type: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  timestamp: string;
  action: string;
  confidence: number;
};

export type ObservedUser = {
  id: string;
  firstSeen: string;
  lastSeen: string;
  tempAccesses: number;
  accessedZones: string[];
  status: string;
  aiAction: string;
  confidence: number;
  faceImage: string;
};

// Camera and device types
export type Camera = {
  id: number;
  name: string;
  zone: string;
  location: string;
};

// Risk and KPI types
export type RiskScore = {
  score: number;
  status: 'low' | 'moderate' | 'high';
};

export type KPIData = {
  totalUsers: number;
  activeZones: number;
  accessesToday: number;
  activeAlerts: number;
  anomalousAttempts: number;
  successRate: number;
};

// Form and UI state types
export type Tab = {
  id: string;
  label: string;
};

export type NewCamera = {
  name: string;
  zone: string;
  location: string;
};
