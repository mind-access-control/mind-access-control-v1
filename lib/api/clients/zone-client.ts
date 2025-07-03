import { EDGE_FUNCTIONS } from '@/lib/constants';
import { CreateZoneRequest, UpdateZoneRequest } from '../services/zone-service';
import { ApiResponse, Zone } from '../types';
import { BaseApiClient } from './base-client';

export class ZoneClient extends BaseApiClient {
  /**
   * Get all zones
   */
  async getZones(): Promise<ApiResponse<Zone[]>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_ZONES, {
      method: 'GET',
    });
  }

  /**
   * Get a specific zone by ID
   */
  async getZone(id: string): Promise<ApiResponse<Zone>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_ZONES}?id=${id}`, {
      method: 'GET',
    });
  }

  /**
   * Create a new zone
   */
  async createZone(request: CreateZoneRequest): Promise<ApiResponse<Zone>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_ZONES, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Update an existing zone
   */
  async updateZone(id: string, request: UpdateZoneRequest): Promise<ApiResponse<Zone>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_ZONES}?id=${id}`, {
      method: 'PUT',
      body: request,
    });
  }

  /**
   * Delete a zone
   */
  async deleteZone(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_ZONES}?id=${id}`, {
      method: 'DELETE',
    });
  }
} 