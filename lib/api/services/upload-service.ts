import { UploadClient } from '@/lib/api/clients/upload-client';
import { supabase } from '@/lib/supabase';
import { UploadImageRequest, UploadImageResponse } from '@/lib/api/types';

// Create a singleton instance of UploadClient
const uploadClient = new UploadClient();

export class UploadService {
  /**
   * Upload an image using the upload-face-image edge function
   * @param request - The request object containing the user ID, image data, and whether the image is for an observed user
   * @returns The response object containing the message and image URL
   */
  static async uploadFaceImage(request: UploadImageRequest): Promise<UploadImageResponse> {
    // Make API call
    const response = await uploadClient.uploadFaceImage(request);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to upload image');
    }

    return response.data;
  }

  /**
   * Generate a signed URL for an existing face image
   * @param imageUrl - The URL of the image to generate a signed URL for
   * @returns The signed URL
   */
  static async getSignedImageUrl(imageUrl: string): Promise<string> {
    try {
      // Extract file path from the stored URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      // Generate signed URL
      const { data, error } = await supabase.storage.from('face-images').createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days expiry
      if (error || !data?.signedUrl) {
        console.error('Error generating signed URL:', error);
        return imageUrl; // Fallback to original URL
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return imageUrl; // Fallback to original URL
    }
  }

  /**
   * Convert a File/Blob to base64 string
   * @param file - The file to convert to base64
   * @returns The base64 string
   */
  static async fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload profile picture for a user
   * @param userId - The ID of the user to upload the profile picture for
   * @param imageData - The image data to upload
   * @param isObservedUser - Whether the image is for an observed user
   * @returns The response object containing the message and image URL
   */
  static async uploadProfilePicture(userId: string, imageData: string | File | Blob, isObservedUser: boolean = false): Promise<UploadImageResponse> {
    // Convert to base64 if it's a File/Blob
    let base64Data: string;
    if (typeof imageData === 'string') {
      base64Data = imageData;
    } else {
      base64Data = await this.fileToBase64(imageData);
    }

    return this.uploadFaceImage({
      userId,
      imageData: base64Data,
      isObservedUser,
    });
  }
}
