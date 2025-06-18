import React, { useState } from 'react';
import { uploadFaceImage, addUserFace } from '@/lib/upload';

export default function FaceUploader({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [embedding, setEmbedding] = useState<number[]>([]); // Populate this from your face recognition model
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    if (!file || embedding.length === 0) return;
    setLoading(true);
    setMessage('');
    try {
      const imageUrl = await uploadFaceImage(userId, file);
      await addUserFace(userId, imageUrl, embedding);
      setMessage('Face data uploaded successfully!');
      setFile(null);
      setEmbedding([]);
    } catch (err) {
      setMessage('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="face-image" className="block text-sm font-medium text-gray-700 mb-2">
          Upload Face Image
        </label>
        <input 
          id="face-image"
          type="file" 
          accept="image/*" 
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
      
      {/* Placeholder for embedding input - replace with actual face recognition integration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Face Embedding (placeholder)
        </label>
        <input 
          type="text" 
          placeholder="Face embedding will be generated automatically"
          disabled
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
      </div>

      <button 
        onClick={handleUpload} 
        disabled={!file || embedding.length === 0 || loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Uploading...' : 'Upload Face'}
      </button>
      
      {message && (
        <div className={`p-3 rounded-md ${
          message.includes('Error') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
} 