import { TabsContent } from '@/components/ui/tabs';
import { useCameraActions } from '@/hooks/camera.hooks';
import { useZoneActions } from '@/hooks/zone.hooks';
import { CameraService } from '@/lib/api/services/camera-service';
import React, { useState } from 'react';
import { CameraDeleteDialog } from './CameraDeleteDialog';
import { CameraForm } from './CameraForm';
import { CameraTable } from './CameraTable';

const CamerasTab: React.FC = () => {
  const { cameras, isLoading, error, fetchCameras } = useCameraActions();
  const { zones } = useZoneActions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<{ id: string; name: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleAddCamera = async (camera: { name: string; zone_id: string; location?: string }) => {
    setLoadingAction(true);
    try {
      await CameraService.createCamera(camera);
      await fetchCameras();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleEditCamera = async (id: string, data: { name: string; zone_id: string; location?: string }) => {
    setLoadingAction(true);
    try {
      await CameraService.updateCamera(id, data);
      await fetchCameras();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteCamera = (camera: { id: string; name: string }) => {
    setCameraToDelete(camera);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCamera = async () => {
    if (!cameraToDelete) return;
    setLoadingAction(true);
    try {
      await CameraService.deleteCamera(cameraToDelete.id);
      await fetchCameras();
    } finally {
      setLoadingAction(false);
      setDeleteDialogOpen(false);
      setCameraToDelete(null);
    }
  };

  return (
    <>
      <TabsContent value="cameras" className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Camera Management</h3>
          <p className="text-gray-600 mb-4">Manage cameras and assign them to specific access zones. Each camera can be assigned to one zone.</p>
        </div>
        <CameraForm zones={zones} onAdd={handleAddCamera} loading={loadingAction} />
        <CameraTable cameras={cameras} zones={zones} onEdit={handleEditCamera} onDelete={handleDeleteCamera} loading={isLoading || loadingAction} />
      </TabsContent>
      <CameraDeleteDialog open={deleteDialogOpen} camera={cameraToDelete} onConfirm={confirmDeleteCamera} onCancel={() => setDeleteDialogOpen(false)} />
    </>
  );
};

export default CamerasTab;
