import { API_BASE_URL } from '@/config/api';

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  job_title: string;
  access_zones: string[];
  avatar_url?: string;
}

export interface AccessLog {
  id: string;
  user_id: string;
  zone: string;
  method: string;
  status: 'Success' | 'Failure';
  timestamp: string;
  jobTitle?: string;
  email?: string;
}

export interface AccessZone {
  id: string;
  name: string;
  description?: string;
  access_level: number;
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'An error occurred');
    }

    return response.json();
  }

  // User endpoints
  async getUsers(): Promise<{ users: User[] }> {
    return this.request('/api/users');
  }

  async createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    jobTitle: string;
    accessZones: string[];
    image?: string;
  }): Promise<{ user: User }> {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<{ message: string }> {
    return this.request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    return this.request(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Access log endpoints
  async getAccessLogs(): Promise<{ logs: AccessLog[] }> {
    return this.request('/api/access');
  }

  async createAccessLog(logData: Omit<AccessLog, 'id'>): Promise<{ log: AccessLog }> {
    return this.request('/api/access', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  }

  async getUserAccessLogs(userId: string): Promise<{ logs: AccessLog[] }> {
    return this.request(`/api/access/user/${userId}`);
  }

  async getZoneAccessLogs(zone: string): Promise<{ logs: AccessLog[] }> {
    return this.request(`/api/access/zone/${zone}`);
  }

  async getDateRangeAccessLogs(startDate: string, endDate: string): Promise<{ logs: AccessLog[] }> {
    return this.request(`/api/access/date-range?startDate=${startDate}&endDate=${endDate}`);
  }

  // Access zone endpoints
  async getAccessZones(): Promise<{ zones: AccessZone[] }> {
    return this.request('/api/zones');
  }

  async createAccessZone(zoneData: Omit<AccessZone, 'id'>): Promise<{ zone: AccessZone }> {
    return this.request('/api/zones', {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
  }

  async updateAccessZone(id: string, zoneData: Partial<AccessZone>): Promise<{ zone: AccessZone }> {
    return this.request(`/api/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(zoneData),
    });
  }

  async deleteAccessZone(id: string): Promise<{ message: string }> {
    return this.request(`/api/zones/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient(); 