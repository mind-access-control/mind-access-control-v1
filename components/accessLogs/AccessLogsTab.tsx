'use client'; // Esta línea va al inicio si es un Client Component
import React, { useEffect, useMemo, useState } from 'react';

// --- Types Import ---
import type { LogSortField, SortDirection, SummaryEntry, SummarySortField } from '@/types';

// --- Mock Data Import ---
import { accessLogs } from '@/mock-data';

// --- Shadcn UI Components ---
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- Lucide React Icons ---
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, TrendingUp } from 'lucide-react';

const AccessLogsTab: React.FC = () => {
  // --- Access Logs Filtering/Sorting States (para la pestaña 'logs' de usuarios registrados) ---
  const [generalSearchTerm, setGeneralSearchTerm] = useState(''); // Renombrado para evitar conflicto
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [logSortField, setLogSortField] = useState<LogSortField>('timestamp');
  const [logSortDirection, setLogSortDirection] = useState<SortDirection>('desc');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState(10);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  // --- Dashboard Filtering/Sorting States ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [summarySortField, setSummarySortField] = useState<SummarySortField>('user');
  const [summarySortDirection, setSummarySortDirection] = useState<SortDirection>('asc');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState('all');

  const handleLogSort = (field: LogSortField) => {
    if (logSortField === field) {
      setLogSortDirection(logSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setLogSortField(field);
      setLogSortDirection('asc');
    }
  };

  const filteredLogs = useMemo(() => {
    return (accessLogs as any[]).filter((log) => {
      const matchSearch = generalSearchTerm ? JSON.stringify(log).toLowerCase().includes(generalSearchTerm.toLowerCase()) : true;
      const matchUser = selectedUser === 'all' ? true : log.user === selectedUser;
      const matchZone = selectedZone === 'all' ? true : log.zone === selectedZone;
      const matchStatus = selectedStatus === 'all' ? true : log.status === selectedStatus;
      const matchMethod = selectedMethod === 'all' ? true : log.method === selectedMethod;

      const logDate = new Date(log.timestamp);
      const fromDateObj = dateFrom ? new Date(dateFrom) : null;
      const toDateObj = dateTo ? new Date(dateTo) : null;

      const matchDate = (!fromDateObj || logDate >= fromDateObj) && (!toDateObj || logDate <= toDateObj);

      return matchSearch && matchUser && matchZone && matchStatus && matchMethod && matchDate;
    });
  }, [generalSearchTerm, selectedUser, selectedZone, selectedStatus, selectedMethod, dateFrom, dateTo, accessLogs]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      if (logSortField === 'timestamp') {
        return logSortDirection === 'asc'
          ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return 0;
    });
  }, [filteredLogs, logSortField, logSortDirection]);

  // --- PAGINACIÓN PARA ACCESS LOGS (REINTRODUCIDA) ---
  const logTotalPages = Math.ceil(sortedLogs.length / logItemsPerPage);
  const logStartIndex = (logCurrentPage - 1) * logItemsPerPage;
  const logEndIndex = logStartIndex + logItemsPerPage;
  const paginatedLogs = sortedLogs.slice(logStartIndex, logEndIndex);
  // Reset log pagination when filters change
  useEffect(() => {
    setLogCurrentPage(1);
  }, [generalSearchTerm, selectedUser, selectedZone, selectedStatus, selectedMethod, dateFrom, dateTo]);

  const handleSummarySort = (field: SummarySortField) => {
    if (summarySortField === field) {
      setSummarySortDirection(summarySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSummarySortField(field);
      setSummarySortDirection('asc');
    }
  };

  const userSummaryData = useMemo((): SummaryEntry[] => {
    return Array.from(new Set((accessLogs as any[]).map((log) => log.user))).map((userName) => {
      const userLogs = (accessLogs as any[]).filter((log) => log.user === userName);
      const successful = userLogs.filter((log) => log.status === 'Successful').length;
      const failed = userLogs.filter((log) => log.status === 'Failed').length;
      const totalAccesses = userLogs.length;
      const successRate = totalAccesses > 0 ? (successful / totalAccesses) * 100 : 0;
      const firstAccess = userLogs.length > 0 ? new Date(Math.min(...userLogs.map((log) => new Date(log.timestamp).getTime()))).toLocaleString() : 'N/A';
      const lastAccess = userLogs.length > 0 ? new Date(Math.max(...userLogs.map((log) => new Date(log.timestamp).getTime()))).toLocaleString() : 'N/A';
      const zoneAccesses: Record<string, number> = userLogs.reduce((acc: Record<string, number>, log) => {
        acc[log.zone] = (acc[log.zone] || 0) + 1;
        return acc;
      }, {});

      return {
        user: userName,
        email: userLogs[0]?.email || 'N/A',
        firstAccess,
        lastAccess,
        totalAccesses,
        successful,
        failed,
        successRate: parseFloat(successRate.toFixed(2)),
        zoneAccesses,
      };
    });
  }, [accessLogs]);

  const filteredSummaryData = useMemo(() => {
    return userSummaryData
      .filter((summary: SummaryEntry) => {
        const matchSearch = summarySearchTerm ? JSON.stringify(summary).toLowerCase().includes(summarySearchTerm.toLowerCase()) : true;
        const matchStatus =
          summaryStatusFilter === 'all'
            ? true
            : summaryStatusFilter === 'successful'
            ? summary.successful > 0
            : summaryStatusFilter === 'failed'
            ? summary.failed > 0
            : true;
        return matchSearch && matchStatus;
      })
      .sort((a: SummaryEntry, b: SummaryEntry) => {
        if (summarySortField === 'user') {
          return summarySortDirection === 'asc' ? a.user.localeCompare(b.user) : b.user.localeCompare(a.user);
        }
        return 0;
      });
  }, [userSummaryData, summarySortField, summarySortDirection, summarySearchTerm, summaryStatusFilter]);

  // --- Reset Pagination on Filter Change ---
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, itemsPerPage]);

  return (
    <>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Access Logs</h2>
          <p className="text-indigo-200">Detailed history of all access attempts</p>
        </div>

        {/* Enhanced Filtering Controls */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filter Access Logs</span>
              <Button onClick={() => setSummaryModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Summary
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-50" />
              </div>

              {/* User Filter */}
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {Array.from(new Set((accessLogs as any[]).map((log) => log.user))).map((user) => (
                      <SelectItem key={user} value={user}>
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zone Filter */}
              <div className="space-y-2">
                <Label>Access Zone</Label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue placeholder="All Zones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {Array.from(new Set((accessLogs as any[]).map((log) => log.zone))).map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Successful">Successful</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Method Filter */}
              <div className="space-y-2">
                <Label>Access Method</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="Facial">Facial</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setSelectedUser('all');
                  setSelectedZone('all');
                  setSelectedStatus('all');
                  setSelectedMethod('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Access Logs Table with Sorting and Pagination */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Access History ({sortedLogs.length} records)</span>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input placeholder="Search logs..." value={generalSearchTerm} onChange={(e) => setGeneralSearchTerm(e.target.value)} className="w-64" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('timestamp')}>
                      <div className="flex items-center">
                        Timestamp
                        {logSortField === 'timestamp' &&
                          (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('user')}>
                      <div className="flex items-center">
                        User Name
                        {logSortField === 'user' &&
                          (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('email')}>
                      <div className="flex items-center">
                        User Email
                        {logSortField === 'email' &&
                          (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('role')}>
                      <div className="flex items-center">
                        User Role
                        {logSortField === 'role' &&
                          (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('zone')}>
                      <div className="flex items-center">
                        Zone
                        {logSortField === 'zone' &&
                          (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('method')}>
                      <div className="flex items-center">
                        Method
                        {logSortField === 'method' &&
                          (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleLogSort('status')}>
                      <div className="flex items-center">
                        Status
                        {logSortField === 'status' &&
                          (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                        <TableCell className="font-medium">{log.user}</TableCell>
                        <TableCell className="text-gray-600">{log.email}</TableCell>
                        <TableCell>
                          <Badge variant={log.role === 'Admin' ? 'default' : 'secondary'}>{log.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {log.zone}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={log.method === 'Facial' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}>
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {generalSearchTerm ||
                        selectedUser !== 'all' ||
                        selectedZone !== 'all' ||
                        selectedStatus !== 'all' ||
                        selectedMethod !== 'all' ||
                        dateFrom ||
                        dateTo
                          ? 'No logs found matching your filters.'
                          : 'No access logs found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls for Logs */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <Select value={logItemsPerPage.toString()} onValueChange={(value) => setLogItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Showing {logStartIndex + 1} to {Math.min(logEndIndex, sortedLogs.length)} of {sortedLogs.length} logs
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setLogCurrentPage(Math.max(1, logCurrentPage - 1))} disabled={logCurrentPage === 1}>
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, logTotalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(logTotalPages - 4, logCurrentPage - 2)) + i;
                    return (
                      <Button
                        key={page}
                        variant={logCurrentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLogCurrentPage(page)}
                        className={`w-8 h-8 p-0 ${logCurrentPage === page ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogCurrentPage(Math.min(logTotalPages, logCurrentPage + 1))}
                  disabled={logCurrentPage === logTotalPages || logTotalPages === 0}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Enhanced Access Summary Modal with Sorting and Filtering */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Access Summary & Insights</DialogTitle>
            <DialogDescription>Daily access summary for all users (Today: {new Date().toLocaleDateString()})</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{Array.from(new Set((accessLogs as any[]).map((log: any) => log.user))).length}</p>
                    <p className="text-sm text-gray-600">Active Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{(accessLogs as any[]).filter((log: any) => log.status === 'Successful').length}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{(accessLogs as any[]).filter((log: any) => log.status === 'Failed').length}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{Array.from(new Set((accessLogs as any[]).map((log: any) => log.zone))).length}</p>
                    <p className="text-sm text-gray-600">Zones Accessed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Filtering and Search for Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Filter User Summary</span>
                  <SlidersHorizontal className="w-4 h-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Search Users</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name or email..."
                        value={summarySearchTerm}
                        onChange={(e) => setSummarySearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Status</Label>
                    <Select value={summaryStatusFilter} onValueChange={setSummaryStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="successful">Users with Successful Access</SelectItem>
                        <SelectItem value="failed">Users with Failed Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSummarySearchTerm('');
                        setSummaryStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Per-User Summary with Sorting */}
            <div>
              <h3 className="text-lg font-semibold mb-4">User Access Summary ({filteredSummaryData.length} users)</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('user')}>
                        <div className="flex items-center">
                          User
                          {summarySortField === 'user' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('email')}>
                        <div className="flex items-center">
                          Email
                          {summarySortField === 'email' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('firstAccess')}>
                        <div className="flex items-center">
                          First Access
                          {summarySortField === 'firstAccess' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('lastAccess')}>
                        <div className="flex items-center">
                          Last Access
                          {summarySortField === 'lastAccess' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('totalAccesses')}>
                        <div className="flex items-center">
                          Total Accesses
                          {summarySortField === 'totalAccesses' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('successRate')}>
                        <div className="flex items-center">
                          Success Rate
                          {summarySortField === 'successRate' &&
                            (summarySortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead>Success/Failed</TableHead>
                      <TableHead>Accesses per Zone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaryData.length > 0 ? (
                      filteredSummaryData.map((summary: any) => (
                        <TableRow key={summary.user}>
                          <TableCell className="font-medium">{summary.user}</TableCell>
                          <TableCell className="text-gray-600">{summary.email}</TableCell>
                          <TableCell className="font-mono text-sm">{summary.firstAccess}</TableCell>
                          <TableCell className="font-mono text-sm">{summary.lastAccess}</TableCell>
                          <TableCell className="text-center font-medium">{summary.totalAccesses}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={summary.successRate >= 80 ? 'default' : summary.successRate >= 50 ? 'secondary' : 'destructive'}
                              className={
                                summary.successRate >= 80 ? 'bg-green-100 text-green-800' : summary.successRate >= 50 ? 'bg-yellow-100 text-yellow-800' : ''
                              }
                            >
                              {summary.successRate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                ✓ {summary.successful}
                              </Badge>
                              <Badge variant="destructive" className="text-xs">
                                ✗ {summary.failed}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(Object.entries(summary.zoneAccesses) as [string, number][]).map(([zone, count]) => (
                                <Badge key={zone} variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                                  {zone}: {count}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {summarySearchTerm || summaryStatusFilter !== 'all' ? 'No users found matching your filters.' : 'No user data available.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccessLogsTab;
