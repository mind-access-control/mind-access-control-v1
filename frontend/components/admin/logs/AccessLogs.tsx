import { useState } from 'react';
import { Button } from "@/components/ui/button";
import LogFilters from "./LogFilters";
import LogTable from "./LogTable";
import AccessSummaryDialog from "./AccessSummaryDialog";

export default function AccessLogs() {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    user: 'all',
    zone: 'all',
    status: 'all',
    method: 'all'
  });

  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({...prev, [name]: value}));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      user: 'all',
      zone: 'all',
      status: 'all',
      method: 'all'
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Access Logs</h2>
        <p className="text-indigo-200">
          Detailed history of all access attempts
        </p>
      </div>

      <div className="space-y-6">
        <LogFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={resetFilters}
          onViewSummary={() => setSummaryDialogOpen(true)}
        />

        <LogTable filters={filters} />
      </div>

      <AccessSummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
      />
    </div>
  );
}
