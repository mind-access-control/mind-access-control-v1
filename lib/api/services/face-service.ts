import { FaceClient } from '@/lib/api/clients/face-client';
import { FaceValidationRequest, UnifiedValidationResponse } from '@/lib/api/types';
import { extractObjectData } from '@/lib/api/utils';

const faceClient = new FaceClient();

export class FaceService {
  /**
   * Validate a face
   * @param request - The request object containing the face embedding, zone ID, and image data
   * @returns The response object containing the validation result
   */
  static async validateFace(request: FaceValidationRequest): Promise<UnifiedValidationResponse> {
    const response = await faceClient.validateFace(request);
    if (!response.success) throw new Error(response.error || 'Failed to validate face');
    return extractObjectData<UnifiedValidationResponse>(response);
  }
}
