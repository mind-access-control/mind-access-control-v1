import { Camera } from '@/lib/api/types';
import { extractArrayData, extractObjectData } from '@/lib/api/utils';
import { CameraClient } from '@/lib/api/clients/camera-client';

const cameraClient = new CameraClient();

export class CameraService {
  /**
   * Get all cameras
   * @returns The cameras
   */
  static async getCameras(): Promise<Camera[]> {
    const response = await cameraClient.getCameras();
    if (!response.success) throw new Error(response.error || 'Failed to fetch cameras');
    return extractArrayData<Camera>(response);
  }

  /**
   * Create a new camera
   * @param data - The camera data
   * @returns The created camera
   */
  static async createCamera(data: Partial<Camera>) {
    const response = await cameraClient.createCamera(data);
    if (!response.success) throw new Error(response.error || 'Failed to create camera');
    return extractObjectData<Camera>(response);
  }

  /**
   * Update an existing camera
   * @param id - The camera ID
   * @param data - The camera data
   * @returns The updated camera
   */
  static async updateCamera(id: string, data: Partial<Camera>) {
    const response = await cameraClient.updateCamera(id, data);
    if (!response.success) throw new Error(response.error || 'Failed to update camera');
    return extractObjectData<Camera>(response);
  }

  /**
   * Delete a camera
   * @param id - The camera ID
   * @returns The deleted camera
   */
  static async deleteCamera(id: string) {
    const response = await cameraClient.deleteCamera(id);
    if (!response.success) throw new Error(response.error || 'Failed to delete camera');
  }
}
