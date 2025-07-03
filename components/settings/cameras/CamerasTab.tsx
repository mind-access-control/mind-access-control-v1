import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { defaultNewCamera, cameras as mockCameras, zones as mockZones } from '@/mock-data';
import { Edit, Save, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';

const CamerasTab: React.FC = () => {
  //States
  const [zones, setZones] = useState(mockZones);
  const [cameras, setCameras] = useState(mockCameras);
  const [newCamera, setNewCamera] = useState(defaultNewCamera);
  const [editingCameraId, setEditingCameraId] = useState<number | null>(null);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [cameraToDelete, setCameraToDelete] = useState<any>(null);
  const [cameraDeleteModalOpen, setCameraDeleteModalOpen] = useState(false);

  const handleAddCamera = () => {
    if (newCamera.name.trim() && newCamera.zone) {
      setCameras((prev) => [...prev, { id: prev.length + 1, ...newCamera }]);
      setNewCamera({ name: '', zone: '', location: '' });
    }
  };

  const startEditingCamera = (camera: any) => {
    setEditingCameraId(camera.id);
    setEditingCamera({ ...camera });
  };

  const cancelEditingCamera = () => {
    setEditingCameraId(null);
    setEditingCamera(null);
  };

  const saveEditingCamera = () => {
    setCameras((prev) => prev.map((camera) => (camera.id === editingCameraId ? { ...editingCamera } : camera)));
    cancelEditingCamera();
  };

  const openCameraDeleteModal = (camera: any) => {
    setCameraToDelete(camera);
    setCameraDeleteModalOpen(true);
  };

  const confirmCameraDelete = () => {
    setCameras((prev) => prev.filter((camera) => camera.id !== cameraToDelete.id));
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  const cancelCameraDelete = () => {
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  return (
    <>
      {/* Camera Management Tab */}
      <TabsContent value="cameras" className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Camera Management</h3>
          <p className="text-gray-600 mb-4">Manage cameras and assign them to specific access zones. Each camera can be assigned to one zone.</p>
        </div>

        {/* Add New Camera Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add New Camera</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="cameraName">Camera Name</Label>
                <Input
                  id="cameraName"
                  placeholder="Enter camera name"
                  value={newCamera.name}
                  onChange={(e) =>
                    setNewCamera({
                      ...newCamera,
                      name: e.target.value,
                    })
                  }
                  className="bg-slate-50"
                />
              </div>
              <div>
                <Label htmlFor="cameraZone">Zone</Label>
                <Select value={newCamera.zone} onValueChange={(value) => setNewCamera({ ...newCamera, zone: value })}>
                  <SelectTrigger id="cameraZone" className="bg-slate-50">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.name}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cameraLocation">Location (Optional)</Label>
                <Input
                  id="cameraLocation"
                  placeholder="Describe camera location"
                  value={newCamera.location}
                  onChange={(e) =>
                    setNewCamera({
                      ...newCamera,
                      location: e.target.value,
                    })
                  }
                  className="bg-slate-50"
                />
              </div>
            </div>
            <Button onClick={handleAddCamera} className="bg-teal-600 hover:bg-teal-700" disabled={!newCamera.name.trim() || !newCamera.zone}>
              Add Camera
            </Button>
          </CardContent>
        </Card>

        {/* Existing Cameras Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing Cameras</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camera Name</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cameras.length > 0 ? (
                  cameras.map((camera) => (
                    <TableRow key={camera.id}>
                      <TableCell>
                        {editingCameraId === camera.id ? (
                          <Input
                            value={editingCamera.name}
                            onChange={(e) =>
                              setEditingCamera({
                                ...editingCamera,
                                name: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          camera.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCameraId === camera.id ? (
                          <Select
                            value={editingCamera.zone}
                            onValueChange={(value) =>
                              setEditingCamera({
                                ...editingCamera,
                                zone: value,
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {zones.map((zone) => (
                                <SelectItem key={zone.id} value={zone.name}>
                                  {zone.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {camera.zone || 'Unassigned'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCameraId === camera.id ? (
                          <Input
                            value={editingCamera.location}
                            onChange={(e) =>
                              setEditingCamera({
                                ...editingCamera,
                                location: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          camera.location || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {editingCameraId === camera.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={saveEditingCamera}
                                className="text-green-600 hover:text-green-700"
                                disabled={!editingCamera.name.trim() || !editingCamera.zone}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEditingCamera} className="text-gray-600 hover:text-gray-700">
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEditingCamera(camera)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openCameraDeleteModal(camera)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No cameras defined. Add your first camera above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      {/* Camera Delete Confirmation Modal */}
      <Dialog open={cameraDeleteModalOpen} onOpenChange={setCameraDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the camera <strong>{cameraToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelCameraDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmCameraDelete} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CamerasTab;
