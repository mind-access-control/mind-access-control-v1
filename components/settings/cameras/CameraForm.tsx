import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState } from 'react';

interface CameraFormProps {
  zones: { id: string; name: string }[];
  onAdd: (camera: { name: string; zone_id: string; location?: string }) => void;
  loading?: boolean;
}

export const CameraForm: React.FC<CameraFormProps> = ({ zones, onAdd, loading }) => {
  const [form, setForm] = useState({ name: '', zone_id: '', location: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim() && form.zone_id) {
      onAdd(form);
      setForm({ name: '', zone_id: '', location: '' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add New Camera</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="cameraName">Camera Name</Label>
              <Input
                id="cameraName"
                placeholder="Enter camera name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-50"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="cameraZone">Zone</Label>
              <Select value={form.zone_id} onValueChange={(value) => setForm({ ...form, zone_id: value })} disabled={loading}>
                <SelectTrigger id="cameraZone" className="bg-slate-50">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
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
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-slate-50"
                disabled={loading}
              />
            </div>
          </div>
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={!form.name.trim() || !form.zone_id || loading}>
            Add Camera
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
