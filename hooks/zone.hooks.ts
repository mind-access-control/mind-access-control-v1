'use client';
import { ZoneService } from '@/lib/api/services/zone-service';
import { Zone } from '@/lib/api/types';
import { useCallback, useEffect, useState } from 'react';

// Create a simple event system for user updates
const zoneUpdateCallbacks: (() => void)[] = [];

const notifyZoneUpdate = () => {
  //console.log(`Notifying ${zoneUpdateCallbacks.length} components about zone update`);
  zoneUpdateCallbacks.forEach((callback) => callback());
};

export function useZoneActions() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await ZoneService.getZones();
      setZones(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch zones');
      setZones([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadZonesAndNotify = useCallback(async () => {
    await fetchZones();
    notifyZoneUpdate();
  }, [fetchZones]);

  useEffect(() => {
    const handleZoneUpdate = () => {
      fetchZones();
    };
    zoneUpdateCallbacks.push(handleZoneUpdate);
    return () => {
      const index = zoneUpdateCallbacks.indexOf(handleZoneUpdate);
      if (index !== -1) {
        zoneUpdateCallbacks.splice(index, 1);
      }
    };
  }, [fetchZones]);

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    fetchZones();
  }, []);

  return {
    zones,
    isLoading,
    error,
    loadZonesAndNotify,
    clearError,
  };
}
