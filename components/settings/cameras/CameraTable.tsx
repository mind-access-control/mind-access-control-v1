import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Save, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';

interface CameraTableProps {
  cameras: {
    id: string;
    name: string;
    zone_id: string;
    location?: string;
    zone?: { id: string; name: string; category?: string } | null;
  }[];
  zones: { id: string; name: string }[];
  onEdit: (id: string, data: { name: string; zone_id: string; location?: string }) => void;
  onDelete: (camera: { id: string; name: string }) => void;
  loading?: boolean;
}

export const CameraTable: React.FC<CameraTableProps> = ({ cameras, zones, onEdit, onDelete, loading }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; zone_id: string; location?: string }>({ name: '', zone_id: '', location: '' });

  const startEdit = (camera: { id: string; name: string; zone_id: string; location?: string }) => {
    setEditingId(camera.id);
    setEditForm({ name: camera.name, zone_id: camera.zone_id, location: camera.location || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', zone_id: '', location: '' });
  };

  const saveEdit = (id: string) => {
    if (editForm.name.trim() && editForm.zone_id) {
      onEdit(id, editForm);
      cancelEdit();
    }
  };

  return (
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
                {editingId === camera.id ? (
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="h-8" disabled={loading} />
                ) : (
                  camera.name
                )}
              </TableCell>
              <TableCell>
                {editingId === camera.id ? (
                  <Select value={editForm.zone_id} onValueChange={(value) => setEditForm({ ...editForm, zone_id: value })} disabled={loading}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {camera.zone?.name || 'Unassigned'}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {editingId === camera.id ? (
                  <Input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="h-8"
                    disabled={loading}
                  />
                ) : (
                  camera.location || '-'
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  {editingId === camera.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveEdit(camera.id)}
                        className="text-green-600 hover:text-green-700"
                        disabled={!editForm.name.trim() || !editForm.zone_id || loading}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="text-gray-600 hover:text-gray-700" disabled={loading}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(camera)} disabled={loading}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete(camera)} className="text-red-600 hover:text-red-700" disabled={loading}>
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
  );
};
