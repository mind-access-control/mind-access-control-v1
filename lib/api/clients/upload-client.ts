import { EDGE_FUNCTIONS } from '@/lib/constants';
import { UploadImageRequest, UploadImageResponse } from '../services/upload-service';
import { ApiResponse } from '../types';
import { BaseApiClient } from './base-client';

export class UploadClient extends BaseApiClient {
  /**
   * Upload an image using the upload-face-image edge function
   */
  async uploadFaceImage(request: UploadImageRequest): Promise<ApiResponse<UploadImageResponse>> {
    return this.makeRequest(EDGE_FUNCTIONS.UPLOAD_FACE_IMAGE, {
      method: 'POST',
      body: request,
    });
  }
}
