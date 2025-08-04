import { EDGE_FUNCTIONS } from '@/lib/constants';
import { ApiResponse, CreateZoneRequest, UpdateZoneRequest, Zone } from '@/lib/api/types';
import { AnonKeyApiClient } from './base-client';

export class ZoneClient extends AnonKeyApiClient {
  /**
   * Get all zones
   * @returns The zones
   */
  async getZones(): Promise<ApiResponse<Zone[]>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_ZONES, {
      method: 'GET',
    });
  }

  /**
   * Get a specific zone by ID
   * @param id - The ID of the zone to fetch
   * @returns The zone
   */
  async getZone(id: string): Promise<ApiResponse<Zone>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_ZONES}?id=${id}`, {
      method: 'GET',
    });
  }

  /**
   * Create a new zone
   * @param request - The request object containing the zone data
   * @returns The created zone
   */
  async createZone(request: CreateZoneRequest): Promise<ApiResponse<Zone>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_ZONES, {
      method: 'POST',
      body: request,
    });
  }

  /**
   * Update an existing zone
   * @param id - The ID of the zone to update
   * @param request - The request object containing the zone data
   * @returns The updated zone
   */
  async updateZone(id: string, request: UpdateZoneRequest): Promise<ApiResponse<Zone>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_ZONES}?id=${id}`, {
      method: 'PUT',
      body: request,
    });
  }

  /**
   * Delete a zone
   * @param id - The ID of the zone to delete
   * @returns The deleted zone
   */
  async deleteZone(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_ZONES}?id=${id}`, {
      method: 'DELETE',
    });
  }
} 