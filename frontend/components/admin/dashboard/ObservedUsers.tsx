import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ObservedUser {
  id: number;
  name: string;
  photoUrl?: string;
  firstSeen: string;
  lastSeen: string;
  tempAccesses: number;
  accessedZones: string[];
  status: "active_temporal" | "in_review_admin" | "pending_review";
  confidence: number;
}

interface ObservedUsersProps {
  users: ObservedUser[];
  onUserDetails: (user: ObservedUser) => void;
  onImageError?: (userId: number, photoUrl: string) => void;
}

type ObservedUserSortField = "id" | "firstSeen" | "lastSeen" | "tempAccesses" | "status" | "confidence";
type SortDirection = "asc" | "desc";

export default function ObservedUsers({ 
  users, 
  onUserDetails, 
  onImageError 
}: ObservedUsersProps) {
  const [sortField, setSortField] = useState<ObservedUserSortField>("lastSeen");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleSort = (field: ObservedUserSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleImageError = (userId: number, photoUrl: string) => {
    setImageErrors(prev => ({ ...prev, [photoUrl]: true }));
    onImageError?.(userId, photoUrl);
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === "firstSeen" || sortField === "lastSeen") {
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
    { key: "photo", label: "Photo", sortable: false },
    { key: "id", label: "ID", sortable: true },
    { key: "firstSeen", label: "First Seen", sortable: true },
    { key: "lastSeen", label: "Last Seen", sortable: true },
    { key: "tempAccesses", label: "Temp Accesses", sortable: true },
    { key: "accessedZones", label: "Accessed Zones", sortable: false },
    { key: "confidence", label: "Confidence", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  const getStatusConfig = (status: ObservedUser["status"]) => {
    switch (status) {
      case "active_temporal":
        return {
          color: "bg-yellow-100 text-yellow-800",
          label: "Active Temporal"
        };
      case "in_review_admin":
        return {
          color: "bg-red-100 text-red-800",
          label: "In Review (Admin)"
        };
      case "pending_review":
        return {
          color: "bg-gray-100 text-gray-800",
          label: "Pending Review"
        };
    }
  };

  const formatAccessZones = (accessZones?: string[]) => {
    if (!accessZones || !Array.isArray(accessZones)) return 'N/A';
    return accessZones.join(", ");
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Observed Users</h2>
        <p className="text-indigo-200">
          Monitor and manage users detected by the system but not yet registered.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
          <div className="text-sm text-gray-600 mb-1">New Observed Users (Today)</div>
          <div className="text-3xl font-bold text-teal-600">2</div>
        </Card>
        <Card className={cn(
          "rounded-xl shadow-lg p-6 flex flex-col items-center bg-white",
          users.filter(u => u.status === "in_review_admin").length > 2
            ? "border-2 border-red-500 bg-red-50 animate-pulse"
            : ""
        )}>
          <div className="text-sm text-gray-600 mb-1">Observed Users Pending Review</div>
          <div className="text-3xl font-bold text-red-600">
            {users.filter(u => u.status === "in_review_admin").length}
          </div>
        </Card>
        <Card className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
          <div className="text-sm text-gray-600 mb-1">Observed Users (This Week)</div>
          <div className="text-3xl font-bold text-blue-600">5</div>
        </Card>
        <Card className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
          <div className="text-sm text-gray-600 mb-1">Total Observed Users</div>
          <div className="text-3xl font-bold text-gray-800">{users.length}</div>
        </Card>
      </div>

      {/* Observed Users Table */}
      <Card className="bg-white rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" /> 
            Observed Users Requiring Action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-gray-500 border-b">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "py-2 px-2 text-left",
                        col.sortable && "cursor-pointer select-none hover:bg-gray-50"
                      )}
                      onClick={() => {
                        if (col.sortable) {
                          handleSort(col.key as ObservedUserSortField);
                        }
                      }}
                    >
                      <span className="flex items-center">
                        {col.label}
                        {col.sortable && sortField === col.key && (
                          sortDirection === "asc" ? (
                            <ChevronUp className="w-3 h-3 ml-1" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-1" />
                          )
                        )}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => {
                  const statusConfig = getStatusConfig(user.status);
                  return (
                    <TableRow key={user.id} className="border-b hover:bg-blue-50 transition">
                      <TableCell className="py-2 px-2">
                        {user.photoUrl && !imageErrors[user.photoUrl] ? (
                          <div className="relative w-8 h-8">
                            <img
                              src={user.photoUrl}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={() => handleImageError(user.id, user.photoUrl!)}
                            />
                          </div>
                        ) : (
                          <UserCircle2 className="w-8 h-8 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell className="py-2 px-2 font-mono">{user.id}</TableCell>
                      <TableCell className="py-2 px-2">{user.firstSeen}</TableCell>
                      <TableCell className="py-2 px-2">{user.lastSeen}</TableCell>
                      <TableCell className="py-2 px-2 text-center">{user.tempAccesses}</TableCell>
                      <TableCell className="py-2 px-2 max-w-[200px] truncate">
                        {formatAccessZones(user.accessedZones)}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          {user.confidence}%
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUserDetails(user)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-400 py-4">
                      No observed users requiring action.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 