import { UploadClient } from '../clients/upload-client';
import { supabase } from '@/lib/supabase';

export interface UploadImageRequest {
  userId: string;
  imageData: string; // Base64 image data
  isObservedUser: boolean;
}

export interface UploadImageResponse {
  message: string;
  imageUrl: string;
}

// Create a singleton instance of UploadClient
const uploadClient = new UploadClient();

export class UploadService {
  /**
   * Upload an image using the upload-face-image edge function
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
