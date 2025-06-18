import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";

interface LogFiltersProps {
  filters: {
    dateFrom: string;
    dateTo: string;
    user: string;
    zone: string;
    status: string;
    method: string;
  };
  onChange: (name: string, value: string) => void;
  onReset: () => void;
  onViewSummary: () => void;
}

export default function LogFilters({
  filters,
  onChange
}: LogFiltersProps) {
  // Mock data - replace with actual data from your API
  const users = ['All Users', 'John Doe', 'Jane Smith', 'Mike Johnson'];
  const zones = ['All Zones', 'Main Entrance', 'Server Room', 'Office Area'];
  const statuses = ['All Statuses', 'Successful', 'Failed'];
  const methods = ['All Methods', 'Facial', 'Card', 'PIN'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Filter Access Logs</h3>
        <Button
          onClick={onViewSummary}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          View Summary
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>From Date</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange('dateFrom', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>To Date</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange('dateTo', e.target.value)}
          />
        </div>

        {/* User Filter */}
        <div className="space-y-2">
          <Label>User</Label>
          <Select
            value={filters.user}
            onValueChange={(value) => onChange('user', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user} value={user}>{user}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zone Filter */}
        <div className="space-y-2">
          <Label>Zone</Label>
          <Select
            value={filters.zone}
            onValueChange={(value) => onChange('zone', value)}
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

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Method Filter */}
        <div className="space-y-2">
          <Label>Method</Label>
          <Select
            value={filters.method}
            onValueChange={(value) => onChange('method', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {methods.map(method => (
                <SelectItem key={method} value={method}>{method}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onReset}
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
