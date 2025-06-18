import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "../shared/camera-capture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Camera, X } from "lucide-react";

interface FaceUploadProps {
  onImageCaptured: (imageData: string) => void;
  onCancel: () => void;
}

export default function FaceUpload({ onImageCaptured, onCancel }: FaceUploadProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Convert file to base64 and store it
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setCapturedImage(base64);
        onImageCaptured(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setShowCamera(false);
    
    // Just store the image data, don't trigger form submission
    onImageCaptured(imageData);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setCapturedImage(null);
    onImageCaptured(''); // Clear the image data
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Upload Face Image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {capturedImage && (
          <div className="relative">
            <img 
              src={capturedImage} 
              alt="Captured face" 
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemoveImage}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUploadClick}
            className="flex-1"
            variant="outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </Button>
          
          <Button
            onClick={() => setShowCamera(true)}
            className="flex-1"
            variant="outline"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
            open={showCamera}
          />
        )}

        <div className="flex gap-2">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
