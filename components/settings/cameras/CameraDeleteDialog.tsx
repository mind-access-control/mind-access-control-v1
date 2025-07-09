import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React from 'react';

interface CameraDeleteDialogProps {
  open: boolean;
  camera: { id: string; name: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CameraDeleteDialog: React.FC<CameraDeleteDialogProps> = ({ open, camera, onConfirm, onCancel }) => (
  <Dialog open={open} onOpenChange={onCancel}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete the camera <strong>{camera?.name}</strong>? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
          Confirm Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
