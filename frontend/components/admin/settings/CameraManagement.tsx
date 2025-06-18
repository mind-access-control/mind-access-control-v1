import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import ConfirmationDialog from "./ConfirmationDialog";

interface Camera {
  id: number;
  name: string;
  zone: string;
  location: string;
}

export default function CameraManagement() {
  const [cameras, setCameras] = useState<Camera[]>([
    { id: 1, name: 'Front Door', zone: 'Main Entrance', location: 'Above main door' },
    { id: 2, name: 'Server Rack', zone: 'Server Room', location: 'North wall' },
  ]);

  const [newCamera, setNewCamera] = useState<Omit<Camera, 'id'>>({
    name: '',
    zone: '',
    location: ''
  });

  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);

  // Mock zones - replace with actual zones from your system
  const zones = ['Main Entrance', 'Server Room', 'Office Area', 'Parking Lot'];

  const handleAddCamera = () => {
    if (newCamera.name && newCamera.zone) {
      setCameras([...cameras, { ...newCamera, id: Date.now() }]);
      setNewCamera({
        name: '',
        zone: '',
        location: '',
      });
    }
  };

  const handleEditCamera = (camera: Camera) => {
    setEditingCamera(camera);
  };

  const handleUpdateCamera = () => {
    if (editingCamera && editingCamera.name && editingCamera.zone) {
      setCameras(cameras.map(c =>
        c.id === editingCamera.id ? editingCamera : c
      ));
      setEditingCamera(null);
    }
  };

  const handleDeleteClick = (camera: Camera) => {
    setCameraToDelete(camera);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (cameraToDelete) {
      setCameras(cameras.filter(c => c.id !== cameraToDelete.id));
      setDeleteDialogOpen(false);
      setCameraToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Add New Camera</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Camera Name</label>
            <Input
              value={editingCamera ? editingCamera.name : newCamera.name}
              onChange={(e) =>
                editingCamera
                  ? setEditingCamera({...editingCamera, name: e.target.value})
                  : setNewCamera({...newCamera, name: e.target.value})
              }
              placeholder="e.g., Front Door"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Zone</label>
            <Select
              value={editingCamera ? editingCamera.zone : newCamera.zone}
              onValueChange={(value) =>
                editingCamera
                  ? setEditingCamera({...editingCamera, zone: value})
                  : setNewCamera({...newCamera, zone: value})
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map(zone => (
                  <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <Input
              value={editingCamera ? editingCamera.location : newCamera.location}
              onChange={(e) =>
                editingCamera
                  ? setEditingCamera({...editingCamera, location: e.target.value})
                  : setNewCamera({...newCamera, location: e.target.value})
              }
              placeholder="e.g., Above main door"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={editingCamera ? handleUpdateCamera : handleAddCamera}
            className="bg-teal-600 hover:bg-teal-700"
            disabled={
              editingCamera
                ? !editingCamera.name || !editingCamera.zone
                : !newCamera.name || !newCamera.zone
            }
          >
            {editingCamera ? 'Update Camera' : 'Add Camera'}
          </Button>

          {editingCamera && (
            <Button
              variant="outline"
              onClick={() => setEditingCamera(null)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Camera Name</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cameras.map(camera => (
              <TableRow key={camera.id}>
                <TableCell className="font-medium">
                  {editingCamera?.id === camera.id ? (
                    <Input
                      value={editingCamera.name}
                      onChange={(e) =>
                        setEditingCamera({...editingCamera, name: e.target.value})
                      }
                    />
                  ) : (
                    camera.name
                  )}
                </TableCell>
                <TableCell>
                  {editingCamera?.id === camera.id ? (
                    <Select
                      value={editingCamera.zone}
                      onValueChange={(value) =>
                        setEditingCamera({...editingCamera, zone: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map(zone => (
                          <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge>{camera.zone}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingCamera?.id === camera.id ? (
                    <Input
                      value={editingCamera.location}
                      onChange={(e) =>
                        setEditingCamera({...editingCamera, location: e.target.value})
                      }
                    />
                  ) : (
                    camera.location || '-'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {editingCamera?.id === camera.id ? null : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCamera(camera)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClick(camera)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Camera"
        description={`Are you sure you want to delete the "${cameraToDelete?.name}" camera? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
}
