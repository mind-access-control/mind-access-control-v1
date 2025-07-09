import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useZoneActions } from '@/hooks/zone.hooks';
import { ZoneService } from '@/lib/api/services/zone-service';
import { zoneCategories } from '@/mock-data';
import { useState } from 'react';

const ZoneForm: React.FC = () => {
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCategory, setNewZoneCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loadZonesAndNotify } = useZoneActions();

  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;

    setIsLoading(true);
    try {
      const newZone = await ZoneService.createZone({
        name: newZoneName.trim(),
        category: newZoneCategory.trim() || 'Employee', // Default to Employee if no category selected
      });
      setNewZoneName('');
      setNewZoneCategory('');
      await loadZonesAndNotify();
    } catch (error) {
      console.error('Failed to create zone:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newZoneName.trim() && !isLoading) {
      handleAddZone();
    }
  };

  const handleCategoryChange = (value: string) => {
    setNewZoneCategory(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add New Zone</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="zoneName">Zone Name</Label>
            <Input
              id="zoneName"
              placeholder="Enter zone name"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-slate-50"
              disabled={isLoading}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="zoneCategory">Category</Label>
            <Select value={newZoneCategory} onValueChange={handleCategoryChange} disabled={isLoading}>
              <SelectTrigger id="zoneCategory" className="bg-slate-50">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {zoneCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddZone} className="bg-teal-600 hover:bg-teal-700" disabled={!newZoneName.trim() || isLoading}>
              {isLoading ? 'Adding...' : 'Add Zone'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ZoneForm;
