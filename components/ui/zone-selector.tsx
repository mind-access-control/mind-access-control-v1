import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zone } from '@/lib/api/types';
import { ChevronDown, X } from 'lucide-react';
import React from 'react';

interface ZoneSelectorProps {
  zones: Zone[];
  selectedZones: string[];
  onZoneToggle: (zoneName: string) => void;
  onSelectAll?: (zoneNames: string[]) => void;
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
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Group zones by category
  const zonesByCategory = React.useMemo(() => {
    const grouped: Record<string, Zone[]> = {};
    
    // Handle cases where zones might be undefined, null, or not an array
    if (!zones || !Array.isArray(zones)) {
      return grouped;
    }
    
    zones.forEach((zone) => {
      // Ensure zone is a valid object with required properties
      if (zone && typeof zone === 'object' && zone.name) {
        const category = zone.category || 'Employee';
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
    // Handle cases where zones might be undefined, null, or not an array
    if (!zones || !Array.isArray(zones)) {
      return [];
    }
    
    return zones.filter((zone) => zone && typeof zone === 'object' && zone.name && selectedZones.includes(zone.name));
  }, [zones, selectedZones]);

  const handleZoneToggle = (zoneName: string) => {
    onZoneToggle(zoneName);
  };

  const removeZone = (zoneName: string) => {
    onZoneToggle(zoneName);
  };

  const handleSelectAll = (zoneNames: string[]) => {
    if (onSelectAll) {
      onSelectAll(zoneNames);
    }
  };

  const handleSelectAllInCategory = (category: string) => {
    const categoryZones = zonesByCategory[category];
    
    // Handle cases where categoryZones might be undefined or empty
    if (!categoryZones || !Array.isArray(categoryZones)) {
      return;
    }
    
    const categoryZoneNames = categoryZones
      .filter((zone) => zone && typeof zone === 'object' && zone.name)
      .map((zone) => zone.name);
    
    const allSelectedInCategory = categoryZoneNames.every((name) => selectedZones.includes(name));

    if (allSelectedInCategory) {
      // Deselect all in category
      categoryZoneNames.forEach((name) => {
        if (selectedZones.includes(name)) {
          onZoneToggle(name);
        }
      });
    } else {
      // Select all in category
      categoryZoneNames.forEach((name) => {
        if (!selectedZones.includes(name)) {
          onZoneToggle(name);
        }
      });
    }
  };

  const handleSelectAllZones = () => {
    // Handle cases where zones might be undefined, null, or not an array
    if (!zones || !Array.isArray(zones)) {
      return;
    }
    
    const allZoneNames = zones
      .filter((zone) => zone && typeof zone === 'object' && zone.name)
      .map((zone) => zone.name);
    
    const allSelected = allZoneNames.every((name) => selectedZones.includes(name));

    if (allSelected) {
      // Deselect all
      allZoneNames.forEach((name) => {
        if (selectedZones.includes(name)) {
          onZoneToggle(name);
        }
      });
    } else {
      // Select all
      allZoneNames.forEach((name) => {
        if (!selectedZones.includes(name)) {
          onZoneToggle(name);
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
                ? `${selectedZones.length} zone${selectedZones.length > 1 ? 's' : ''} selected`
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
                      checked={zones.length > 0 && zones.every((zone) => selectedZones.includes(zone.name))}
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
                  const categoryZoneNames = categoryZones.map((zone) => zone.name);
                  const allSelectedInCategory = categoryZoneNames.every((name) => selectedZones.includes(name));

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs font-medium">
                          {category}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          ({categoryZones.length} zone{categoryZones.length > 1 ? 's' : ''})
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
                            <Checkbox id={`zone-${zone.id}`} checked={selectedZones.includes(zone.name)} onCheckedChange={() => handleZoneToggle(zone.name)} />
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
              <button className="ml-1 hover:text-red-500" onClick={() => removeZone(zone.name)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
