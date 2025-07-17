import { EDGE_FUNCTIONS } from '@/lib/constants';
import { ApiResponse, Camera } from '../types';
import { BaseApiClient } from './base-client';

export class CameraClient extends BaseApiClient {
  /**
   * Get all cameras
   * @returns The cameras
   */
  async getCameras(): Promise<ApiResponse<Camera[]>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_CAMERAS, { method: 'GET' });
  }

  /**
   * Create a new camera
   * @param request - The request object containing the camera data
   * @returns The created camera
   */
  async createCamera(request: Partial<Camera>): Promise<ApiResponse<Camera>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_CAMERAS, { method: 'POST', body: request });
  }

  /**
   * Update an existing camera
   * @param id - The ID of the camera to update
   * @param request - The request object containing the camera data
   * @returns The updated camera
   */
  async updateCamera(id: string, request: Partial<Camera>): Promise<ApiResponse<Camera>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_CAMERAS}?id=${id}`, { method: 'PUT', body: request });
  }

  /**
   * Delete a camera
   * @param id - The ID of the camera to delete
   * @returns The deleted camera
   */
  async deleteCamera(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest(`${EDGE_FUNCTIONS.EF_CAMERAS}?id=${id}`, { method: 'DELETE' });
  }
}
