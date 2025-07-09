import { CameraClient } from '../clients/camera-client';
import { Camera } from '../types';
import { extractArrayData, extractObjectData } from '../utils';

const cameraClient = new CameraClient();

export class CameraService {
  /**
   * Get all cameras
   */
  static async getCameras(): Promise<Camera[]> {
    const response = await cameraClient.getCameras();
    if (!response.success) throw new Error(response.error || 'Failed to fetch cameras');
    return extractArrayData<Camera>(response);
  }

  /**
   * Create a new camera
   */
  static async createCamera(data: Partial<Camera>) {
    const response = await cameraClient.createCamera(data);
    if (!response.success) throw new Error(response.error || 'Failed to create camera');
    return extractObjectData<Camera>(response);
  }

  /**
   * Update an existing camera
   */
  static async updateCamera(id: string, data: Partial<Camera>) {
    const response = await cameraClient.updateCamera(id, data);
    if (!response.success) throw new Error(response.error || 'Failed to update camera');
    return extractObjectData<Camera>(response);
  }

  /**
   * Delete a camera
   */
  static async deleteCamera(id: string) {
    const response = await cameraClient.deleteCamera(id);
    if (!response.success) throw new Error(response.error || 'Failed to delete camera');
  }
}
