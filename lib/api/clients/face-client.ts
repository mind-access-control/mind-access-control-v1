import { BaseApiClient } from './base-client';
import { ApiResponse, FaceValidationRequest, UnifiedValidationResponse } from '../types';
import { EDGE_FUNCTIONS } from '@/lib/constants';

export class FaceClient extends BaseApiClient {
  /**
   * Validate a face
   * @param request - The request object containing the face embedding, zone ID, and image data
   * @returns The response object containing the validation result
   */
  async validateFace(request: FaceValidationRequest): Promise<ApiResponse<UnifiedValidationResponse>> {
    return this.makeRequest(EDGE_FUNCTIONS.VALIDATE_USER_FACE, { method: 'POST', body: request });
  }
}
