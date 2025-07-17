import { EDGE_FUNCTIONS } from '@/lib/constants';
import { ApiResponse, UploadImageRequest, UploadImageResponse } from '@/lib/api/types';
import { BaseApiClient } from './base-client';

export class UploadClient extends BaseApiClient {
  /**
   * Upload an image using the upload-face-image edge function
   * @param request - The request object containing the user ID, image data, and whether the image is for an observed user
   * @returns The response object containing the message and image URL
   */
  async uploadFaceImage(request: UploadImageRequest): Promise<ApiResponse<UploadImageResponse>> {
    return this.makeRequest(EDGE_FUNCTIONS.UPLOAD_FACE_IMAGE, {
      method: 'POST',
      body: request,
    });
  }
}
