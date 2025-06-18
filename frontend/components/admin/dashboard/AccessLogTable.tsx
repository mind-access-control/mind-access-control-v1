import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Search, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessLog {
  id: number;
  timestamp: string;
  user: string;
  email: string;
  zone: string;
  status: "Success" | "Failure";
  method: string;
  aiClassification?: string;
  confidence?: number;
}

interface AccessLogTableProps {
  logs: AccessLog[];
  onAIDetails: (log: AccessLog) => void;
}

type LogSortField = "timestamp" | "user" | "email" | "zone" | "method" | "status";
type SortDirection = "asc" | "desc";

export default function AccessLogTable({ logs, onAIDetails }: AccessLogTableProps) {
  const [sortField, setSortField] = useState<LogSortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSort = (field: LogSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedLogs = logs
    .filter(log => 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.zone.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "timestamp") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const columns = [
    { key: "timestamp", label: "Timestamp", sortable: true },
    { key: "user", label: "User Name", sortable: true },
    { key: "email", label: "User Email", sortable: true },
    { key: "zone", label: "Zone", sortable: true },
    { key: "method", label: "Method", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "aiClassification", label: "AI Classification", sortable: false },
    { key: "actions", label: "Actions", sortable: false },
  ];

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Access History ({filteredAndSortedLogs.length} records)</span>
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "cursor-pointer hover:bg-gray-50 select-none",
                      !col.sortable && "cursor-default"
                    )}
                    onClick={() => {
                      if (col.sortable) {
                        handleSort(col.key as LogSortField);
                      }
                    }}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {col.sortable && sortField === col.key && (
                        sortDirection === "asc" ? (
                          <ChevronUp className="w-4 h-4 ml-1" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-1" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell className="text-gray-600">{log.email}</TableCell>
                  <TableCell>{log.zone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {log.method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        log.status === "Success"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.aiClassification ? (
                      <Badge variant="secondary" className="text-xs">
                        {log.aiClassification}
                        {log.confidence && ` (${log.confidence}%)`}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAIDetails(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAndSortedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-4">
                    {searchTerm ? "No logs found matching your search." : "No access logs available."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 