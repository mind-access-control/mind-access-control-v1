import { CameraService } from '@/lib/api/services/camera-service';
import { Camera } from '@/lib/api/types';
import { useCallback, useEffect, useState } from 'react';

export function useCameraActions() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await CameraService.getCameras();
      setCameras(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cameras');
      setCameras([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  return { cameras, isLoading, error, fetchCameras, setCameras };
}
