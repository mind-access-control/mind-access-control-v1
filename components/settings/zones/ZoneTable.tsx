import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useZoneActions } from '@/hooks/zone.hooks';
import { ZoneService } from '@/lib/api/services/zone-service';
import { Zone } from '@/lib/api/types';
import { Edit, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';

const ZoneTable: React.FC = () => {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZoneName, setEditingZoneName] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { zones, loadZonesAndNotify } = useZoneActions();

  const startEditingZone = (zone: Zone) => {
    setEditingZoneId(zone.id);
    setEditingZoneName(zone.name);
  };

  const cancelEditingZone = () => {
    setEditingZoneId(null);
    setEditingZoneName('');
  };

  const saveEditingZone = async () => {
    if (!editingZoneId || !editingZoneName.trim()) return;

    setIsLoading(editingZoneId);
    try {
      const updatedZone = await ZoneService.updateZone(editingZoneId, {
        name: editingZoneName.trim(),
      });
      await loadZonesAndNotify();
      cancelEditingZone();
    } catch (error) {
      console.error('Failed to update zone:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    setIsLoading(zone.id);
    try {
      await ZoneService.deleteZone(zone.id);
      await loadZonesAndNotify();
    } catch (error) {
      console.error('Failed to delete zone:', error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingZoneName.trim() && !isLoading) {
      saveEditingZone();
    } else if (e.key === 'Escape') {
      cancelEditingZone();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Existing Zones</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone Name</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zones.length > 0 ? (
              zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell>
                    {editingZoneId === zone.id ? (
                      <Input
                        value={editingZoneName}
                        onChange={(e) => setEditingZoneName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="h-8"
                        disabled={isLoading === zone.id}
                      />
                    ) : (
                      zone.name
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {editingZoneId === zone.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={saveEditingZone}
                            className="text-green-600 hover:text-green-700"
                            disabled={!editingZoneName.trim() || isLoading === zone.id}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditingZone}
                            className="text-gray-600 hover:text-gray-700"
                            disabled={isLoading === zone.id}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEditingZone(zone)} disabled={isLoading === zone.id}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteZone(zone)}
                            className="text-red-600 hover:text-red-700"
                            disabled={isLoading === zone.id}
                          >
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
                <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                  No zones defined. Add your first zone above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ZoneTable;
