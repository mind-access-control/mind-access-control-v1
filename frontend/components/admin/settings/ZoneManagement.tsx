import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Zone {
  id: number;
  name: string;
}

export default function ZoneManagement() {
  const [zones, setZones] = useState<Zone[]>([
    { id: 1, name: 'Main Entrance' },
    { id: 2, name: 'Server Room' },
    { id: 3, name: 'Office Area' },
  ]);

  const [newZone, setNewZone] = useState('');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);

  const handleAddZone = () => {
    if (newZone.trim()) {
      setZones([...zones, { id: Date.now(), name: newZone.trim() }]);
      setNewZone('');
    }
  };

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
  };

  const handleUpdateZone = () => {
    if (editingZone && editingZone.name.trim()) {
      setZones(zones.map(z =>
        z.id === editingZone.id ? { ...z, name: editingZone.name.trim() } : z
      ));
      setEditingZone(null);
    }
  };

  const handleDeleteClick = (zone: Zone) => {
    setZoneToDelete(zone);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (zoneToDelete) {
      setZones(zones.filter(z => z.id !== zoneToDelete.id));
      setDeleteDialogOpen(false);
      setZoneToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Add New Zone</h3>

        <div className="flex gap-2">
          <Input
            value={editingZone ? editingZone.name : newZone}
            onChange={(e) =>
              editingZone
                ? setEditingZone({...editingZone, name: e.target.value})
                : setNewZone(e.target.value)
            }
            placeholder="Enter zone name"
          />
          <Button
            onClick={editingZone ? handleUpdateZone : handleAddZone}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {editingZone ? 'Update Zone' : 'Add Zone'}
          </Button>
          {editingZone && (
            <Button
              variant="outline"
              onClick={() => setEditingZone(null)}
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
              <TableHead>Zone Name</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.map(zone => (
              <TableRow key={zone.id}>
                <TableCell className="font-medium">
                  {editingZone?.id === zone.id ? (
                    <Input
                      value={editingZone.name}
                      onChange={(e) =>
                        setEditingZone({...editingZone, name: e.target.value})
                      }
                    />
                  ) : (
                    zone.name
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {editingZone?.id === zone.id ? null : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditZone(zone)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClick(zone)}
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
        title="Delete Zone"
        description={`Are you sure you want to delete "${zoneToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  );
}
