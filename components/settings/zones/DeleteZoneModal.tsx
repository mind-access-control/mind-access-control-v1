'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zone } from '@/lib/api/types';

interface DeleteZoneModalProps {
  zone: Zone | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hasAssignedCameras: boolean;
  isLoading?: boolean;
}

const DeleteZoneModal: React.FC<DeleteZoneModalProps> = ({ zone, isOpen, onClose, onConfirm, hasAssignedCameras, isLoading = false }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the zone <strong>{zone?.name}</strong>? This action cannot be undone.
            {hasAssignedCameras && (
              <div className="mt-2 text-red-600">Warning: This zone has cameras assigned to it. Deleting this zone will unassign these cameras.</div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteZoneModal;
