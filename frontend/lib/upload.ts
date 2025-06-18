const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Upload face image for a user
export async function uploadFaceImage(userId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/upload/face/${userId}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload face image');
  }

  const result = await response.json();
  return result.imageUrl;
}

// Upload user profile image
export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/api/upload/profile/${userId}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload profile image');
  }

  const result = await response.json();
  return result.imageUrl;
}

// Upload any file (generic)
export async function uploadFile(file: File, bucket: string = 'general'): Promise<{
  fileUrl: string;
  fileName: string;
  originalName: string;
  size: number;
  mimetype: string;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  const response = await fetch(`${API_BASE_URL}/api/upload/file`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  const result = await response.json();
  return {
    fileUrl: result.fileUrl,
    fileName: result.fileName,
    originalName: result.originalName,
    size: result.size,
    mimetype: result.mimetype,
  };
}

// Add user face data to database
export async function addUserFace(userId: string, imageUrl: string, embedding: number[]) {
  const response = await fetch(`${API_BASE_URL}/api/user-faces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      userId, 
      faceData: { imageUrl, embedding },
      metadata: { uploadedAt: new Date().toISOString() }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add face data');
  }

  return response.json();
} 