import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useMemo } from 'react';

interface Log {
  id: number;
  timestamp: string;
  user: string;
  email: string;
  role: string;
  zone: string;
  method: string;
  status: string;
}

interface LogTableProps {
  filters: {
    dateFrom: string;
    dateTo: string;
    user: string;
    zone: string;
    status: string;
    method: string;
  };
}

export default function LogTable({ filters }: LogTableProps) {
  // Mock data - replace with actual data from your API
  const logs: Log[] = [
    {
      id: 1,
      timestamp: '2023-07-15T10:30:00',
      user: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      zone: 'Main Entrance',
      method: 'Facial',
      status: 'Successful'
    },
    {
      id: 2,
      timestamp: '2023-07-15T09:15:00',
      user: 'Jane Smith',
      email: 'jane@example.com',
      role: 'User',
      zone: 'Server Room',
      method: 'Card',
      status: 'Successful'
    },
    {
      id: 3,
      timestamp: '2023-07-14T17:45:00',
      user: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'Guest',
      zone: 'Main Entrance',
      method: 'PIN',
      status: 'Failed'
    }
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Apply all filters
      const matchesDateFrom = !filters.dateFrom || new Date(log.timestamp) >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || new Date(log.timestamp) <= new Date(filters.dateTo);
      const matchesUser = filters.user === 'All Users' || log.user === filters.user;
      const matchesZone = filters.zone === 'All Zones' || log.zone === filters.zone;
      const matchesStatus = filters.status === 'All Statuses' || log.status === filters.status;
      const matchesMethod = filters.method === 'All Methods' || log.method === filters.method;

      return matchesDateFrom && matchesDateTo && matchesUser && matchesZone && matchesStatus && matchesMethod;
    });
  }, [logs, filters]);

  // Sort by timestamp (newest first)
  const sortedLogs = [...filteredLogs].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLogs.length > 0 ? (
            sortedLogs.map(log => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                <TableCell className="font-medium">{log.user}</TableCell>
                <TableCell>{log.email}</TableCell>
                <TableCell>
                  <Badge variant={log.role === 'Admin' ? 'default' : 'secondary'}>{log.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {log.zone}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${
                      log.method === 'Facial' ? 'bg-green-50 text-green-700' :
                      log.method === 'Card' ? 'bg-purple-50 text-purple-700' :
                      'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {log.method}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={log.status === 'Successful' ? 'default' : 'destructive'}
                    className={log.status === 'Successful' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                No logs found matching your filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
