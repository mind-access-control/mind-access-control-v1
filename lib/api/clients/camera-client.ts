import { EDGE_FUNCTIONS } from '@/lib/constants';
import { ApiResponse, Camera } from '../types';
import { BaseApiClient } from './base-client';

export class CameraClient extends BaseApiClient {
  /**
   * Get all cameras
   */
  async getCameras(): Promise<ApiResponse<Camera[]>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_CAMERAS, { method: 'GET' });
  }

  /**
   * Create a new camera
   */
  async createCamera(request: Partial<Camera>): Promise<ApiResponse<Camera>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_CAMERAS, { method: 'POST', body: request });
  }

  /**
   * Update an existing camera
   */
  async updateCamera(id: string, request: Partial<Camera>): Promise<ApiResponse<Camera>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_CAMERAS}?id=${id}`, { method: 'PUT', body: request });
  }

  /**
   * Delete a camera
   */
  async deleteCamera(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_CAMERAS}?id=${id}`, { method: 'DELETE' });
  }
}
