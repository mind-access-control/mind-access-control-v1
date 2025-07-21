import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zone } from '@/lib/api/types';
import { ChevronDown, X } from 'lucide-react';
import React from 'react';
import { DEFAULT_ZONE_CATEGORY, EMPTY_STRING } from '@/lib/constants';

interface ZoneSelectorProps {
  zones: Zone[];
  selectedZones: string[]; // Array of zone IDs
  onZoneToggle: (zoneId: string) => void;
  onSelectAll?: (zoneIds: string[]) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  zones,
  selectedZones,
  onZoneToggle,
  onSelectAll,
  loading = false,
  error = null,
  disabled = false,
  placeholder = 'Select zones',
  className = EMPTY_STRING,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Group zones by category
  const zonesByCategory = React.useMemo(() => {
    const grouped: Record<string, Zone[]> = {};
    if (!zones || !Array.isArray(zones)) {
      return grouped;
    }
    zones.forEach((zone) => {
      if (zone && typeof zone === 'object' && zone.name) {
        const category = zone.category || DEFAULT_ZONE_CATEGORY;
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(zone);
      }
    });
    return grouped;
  }, [zones]);

  // Get unique categories sorted alphabetically
  const categories = React.useMemo(() => {
    return Object.keys(zonesByCategory).sort();
  }, [zonesByCategory]);

  // Get selected zone objects for display
  const selectedZoneObjects = React.useMemo(() => {
    if (!zones || !Array.isArray(zones)) {
      return [];
    }
    return zones.filter((zone) => zone && typeof zone === 'object' && zone.name && selectedZones.includes(zone.id));
  }, [zones, selectedZones]);

  const handleZoneToggle = (zoneId: string) => {
    onZoneToggle(zoneId);
  };

  const removeZone = (zoneId: string) => {
    onZoneToggle(zoneId);
  };

  const handleSelectAll = (zoneIds: string[]) => {
    if (onSelectAll) {
      onSelectAll(zoneIds);
    }
  };

  const handleSelectAllInCategory = (category: string) => {
    const categoryZones = zonesByCategory[category];
    if (!categoryZones || !Array.isArray(categoryZones)) {
      return;
    }
    const categoryZoneIds = categoryZones.filter((zone) => zone && typeof zone === 'object' && zone.name).map((zone) => zone.id);
    const allSelectedInCategory = categoryZoneIds.every((id) => selectedZones.includes(id));
    if (allSelectedInCategory) {
      categoryZoneIds.forEach((id) => {
        if (selectedZones.includes(id)) {
          onZoneToggle(id);
        }
      });
    } else {
      categoryZoneIds.forEach((id) => {
        if (!selectedZones.includes(id)) {
          onZoneToggle(id);
        }
      });
    }
  };

  const handleSelectAllZones = () => {
    if (!zones || !Array.isArray(zones)) {
      return;
    }
    const allZoneIds = zones.filter((zone) => zone && typeof zone === 'object' && zone.name).map((zone) => zone.id);
    const allSelected = allZoneIds.every((id) => selectedZones.includes(id));
    if (allSelected) {
      allZoneIds.forEach((id) => {
        if (selectedZones.includes(id)) {
          onZoneToggle(id);
        }
      });
    } else {
      allZoneIds.forEach((id) => {
        if (!selectedZones.includes(id)) {
          onZoneToggle(id);
        }
      });
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>Access Zones</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between bg-slate-50 border-0 h-12 text-left font-normal"
            disabled={disabled || loading}
          >
            <span>
              {loading
                ? 'Loading zones...'
                : error
                  ? `Error: ${error}`
                  : selectedZones.length > 0
                    ? `${selectedZones.length} zone${selectedZones.length > 1 ? 's' : EMPTY_STRING} selected`
                    : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2 space-y-4 max-h-[400px] overflow-auto">
            {error ? (
              <div className="text-red-500 p-2">Error: {error}</div>
            ) : loading ? (
              <div className="text-gray-500 p-2">Loading zones...</div>
            ) : zones.length > 0 ? (
              <>
                {/* Global Select All */}
                <div className="border-b pb-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-zones"
                      checked={zones.length > 0 && zones.every((zone) => selectedZones.includes(zone.id))}
                      onCheckedChange={handleSelectAllZones}
                    />
                    <label
                      htmlFor="select-all-zones"
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Select All Zones
                    </label>
                    <span className="text-xs text-gray-500">({zones.length} total)</span>
                  </div>
                </div>

                {/* Categories */}
                {categories.map((category) => {
                  const categoryZones = zonesByCategory[category];
                  const categoryZoneIds = categoryZones.map((zone) => zone.id);
                  const allSelectedInCategory = categoryZoneIds.every((id) => selectedZones.includes(id));

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs font-medium">
                          {category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          ({categoryZones.length} zone{categoryZones.length > 1 ? 's' : EMPTY_STRING})
                        </span>
                        {/* Category Select All */}
                        <div className="ml-auto">
                          <Checkbox
                            id={`select-all-${category}`}
                            checked={categoryZones.length > 0 && allSelectedInCategory}
                            onCheckedChange={() => handleSelectAllInCategory(category)}
                          />
                          <label htmlFor={`select-all-${category}`} className="text-xs text-blue-600 ml-1 cursor-pointer hover:text-blue-800">
                            Select All
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1 ml-2">
                        {categoryZones.map((zone) => (
                          <div key={zone.id} className="flex items-center space-x-2">
                            <Checkbox id={`zone-${zone.id}`} checked={selectedZones.includes(zone.id)} onCheckedChange={() => handleZoneToggle(zone.id)} />
                            <label
                              htmlFor={`zone-${zone.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {zone.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="p-2 text-gray-500">No zones available</div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected zones display */}
      {selectedZoneObjects.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedZoneObjects.map((zone) => (
            <Badge key={zone.id} variant="secondary" className="bg-slate-100">
              <span className="text-xs text-gray-600 mr-1">[{zone.category}]</span>
              {zone.name}
              <button className="ml-1 hover:text-red-500" onClick={() => removeZone(zone.id)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
