import { TabsContent } from '@/components/ui/tabs';
import { cameras as mockCameras } from '@/mock-data';
import React, { useState } from 'react';

// Import the new components
import ZoneForm from './ZoneForm';
import DeleteZoneModal from './DeleteZoneModal';
import ErrorNotification from './ErrorNotification';
import LoadingSpinner from './LoadingSpinner';
import ZoneTable from './ZoneTable';
import { useZoneActions } from '@/hooks/zone.hooks';
import { Zone } from '@/lib/api/types';

const ZonesTab: React.FC = () => {
  const { zones, isLoading, error, clearError } = useZoneActions();
  const [cameras] = useState(mockCameras); // Keep cameras for now, could be moved to a separate hook later
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const [zoneDeleteModalOpen, setZoneDeleteModalOpen] = useState(false);

  const handleZoneDeleted = (zoneId: string) => {
    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  const cancelZoneDelete = () => {
    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  const hasAssignedCameras = (zoneName: string) => {
    return cameras.some((camera) => camera.zone === zoneName);
  };

  if (isLoading) {
    return (
      <TabsContent value="zones" className="space-y-6">
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner message="Loading zones..." size="lg" />
        </div>
      </TabsContent>
    );
  }

  return (
    <>
      <TabsContent value="zones" className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Zone Management</h3>
          <p className="text-gray-600 mb-4">Define and manage access zones for your facility. Each zone can have multiple cameras assigned to it.</p>
        </div>

        {/* Error Notification */}
        <ErrorNotification error={error} onClear={clearError} />

        {/* Add New Zone Form */}
        <ZoneForm />
        {/* Existing Zones Table */}
        <ZoneTable />
      </TabsContent>

      {/* Zone Delete Confirmation Modal */}
      <DeleteZoneModal
        zone={zoneToDelete}
        isOpen={zoneDeleteModalOpen}
        onClose={cancelZoneDelete}
        onConfirm={() => zoneToDelete && handleZoneDeleted(zoneToDelete.id)}
        hasAssignedCameras={zoneToDelete ? hasAssignedCameras(zoneToDelete.name) : false}
      />
    </>
  );
};

export default ZonesTab;
