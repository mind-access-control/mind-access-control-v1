'use client'; // This line goes at the beginning if it's a Client Component
import React, { useCallback, useEffect, useMemo, useState } from 'react';

// --- Constants Import ---
import { AccessLogFilter, DisplayLog, LogSortField, Role, SummaryEntry, SummarySortField, UserForFilter, UserStatus, Zone } from '@/lib/api/types';
import {
  DEFAULT_FILTER_VALUES,
  DEFAULT_LOG_CURRENT_PAGE,
  DEFAULT_LOG_ITEMS_PER_PAGE,
  DEFAULT_LOG_SORT_FIELD,
  DEFAULT_SUMMARY_SORT_FIELD,
  EMPTY_STRING,
  IMAGE_FALLBACKS,
  LOG_COLUMNS,
  NA_VALUE,
  PAGINATION_OPTIONS,
  SELECT_ALL_VALUE,
  DECISION_FILTER_OPTIONS,
  SUCCESS_RATE_THRESHOLDS,
  SUMMARY_STATUS_FILTER_OPTIONS,
} from '@/lib/constants';

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
import { ChevronDown, ChevronUp, RefreshCcw, Search, SlidersHorizontal, TrendingUp, UserCircle } from 'lucide-react';
import { LogDecision, SortDirection } from '@/app/enums';
import { CatalogService, UserService, AccessLogService, ZoneService } from '@/lib/api/services';

const AccessLogsTab: React.FC = () => {
  // --- Access Logs Filtering/Sorting States ---
  const [accessLogs, setAccessLogs] = useState<DisplayLog[]>([]);
  const [loadingAccessLogs, setLoadingAccessLogs] = useState(true);
  const [errorAccessLogs, setErrorAccessLogs] = useState<string | null>(null);

  const [generalSearchTerm, setGeneralSearchTerm] = useState(DEFAULT_FILTER_VALUES.generalSearchTerm);
  const [dateFrom, setDateFrom] = useState(DEFAULT_FILTER_VALUES.dateFrom);
  const [dateTo, setDateTo] = useState(DEFAULT_FILTER_VALUES.dateTo);
  const [selectedLogUserId, setSelectedLogUserId] = useState(DEFAULT_FILTER_VALUES.selectedLogUserId);
  const [selectedLogZoneId, setSelectedLogZoneId] = useState(DEFAULT_FILTER_VALUES.selectedLogZoneId);
  const [selectedLogDecisionId, setSelectedLogDecisionId] = useState(DEFAULT_FILTER_VALUES.selectedLogDecisionId);

  const [logSortField, setLogSortField] = useState<LogSortField>(DEFAULT_LOG_SORT_FIELD);
  const [logSortDirection, setLogSortDirection] = useState<SortDirection>(SortDirection.DESC);
  const [logCurrentPage, setLogCurrentPage] = useState(DEFAULT_LOG_CURRENT_PAGE);
  const [logItemsPerPage, setLogItemsPerPage] = useState(DEFAULT_LOG_ITEMS_PER_PAGE);

  // --- Summary Modal States ---
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summarySortField, setSummarySortField] = useState<SummarySortField>(DEFAULT_SUMMARY_SORT_FIELD);
  const [summarySortDirection, setSummarySortDirection] = useState<SortDirection>(SortDirection.ASC);
  const [summarySearchTerm, setSummarySearchTerm] = useState(DEFAULT_FILTER_VALUES.summarySearchTerm);
  const [summaryStatusFilter, setSummaryStatusFilter] = useState(DEFAULT_FILTER_VALUES.summaryStatusFilter);

  // --- AI Details Modal State (kept for potential future use, not used in main table) ---
  const [aiDetailsLog, setAIDetailsLog] = useState<any>(null);

  // --- Image Modal States ---
  const [imageModalOpen, setImageModalOpen] = useState(false); // Nuevo estado para controlar el modal de imagen
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // Nuevo estado para la URL de la imagen en el modal

  // --- Catalog States (fetched within this component) ---
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);

  const [zonesList, setZonesList] = useState<Zone[]>([]);
  const [loadingZonesList, setLoadingZonesList] = useState(true);
  const [errorZonesList, setErrorZonesList] = useState<string | null>(null);

  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [loadingUserStatuses, setLoadingUserStatuses] = useState(true);
  const [errorUserStatuses, setErrorUserStatuses] = useState<string | null>(null);

  const [allUsersForFilter, setAllUsersForFilter] = useState<UserForFilter[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(true);
  const [errorAllUsers, setErrorAllUsers] = useState<string | null>(null);

  // State to control if catalogs are ready
  const [catalogsReady, setCatalogsReady] = useState(false);

  // --- Fetch Catalogs (Roles, Zones, User Statuses, All Users) ---
  const fetchCatalogs = useCallback(async () => {
    // console.log('DEBUG: fetchCatalogs STARTING');
    setLoadingRoles(true);
    setErrorRoles(null);
    setLoadingZonesList(true);
    setErrorZonesList(null);
    setLoadingUserStatuses(true);
    setErrorUserStatuses(null);
    setLoadingAllUsers(true);
    setErrorAllUsers(null);

    let allCatalogsLoaded = true;

    try {
      const roles = await CatalogService.getRoles();
      setRoles(roles || []);
      // console.log('DEBUG: Roles Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      setErrorRoles(error.message || 'Failed to load roles.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingRoles(false);
    }

    try {
      const zones = await ZoneService.getZones();
      setZonesList(zones || []);
      // console.log('DEBUG: Zones Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching zones:', error);
      setErrorZonesList(error.message || 'Failed to load zones.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingZonesList(false);
    }

    try {
      const userStatuses = await CatalogService.getUserStatuses();
      setUserStatuses(userStatuses || []);
      // console.log('DEBUG: User Statuses Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching user statuses:', error);
      setErrorUserStatuses(error.message || 'Failed to load user statuses.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingUserStatuses(false);
    }

    try {
      const users = await UserService.getAllUsersForFilter();
      setAllUsersForFilter(users || []);
      // console.log('DEBUG: All Users for Filter Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching all users for filter:', error);
      setErrorAllUsers(error.message || 'Failed to load all users for filter.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingAllUsers(false);
    }

    setCatalogsReady(allCatalogsLoaded);
    // console.log('DEBUG: fetchCatalogs FINISHED. catalogsReady:', allCatalogsLoaded);
  }, []);

  useEffect(() => {
    // console.log('DEBUG: useEffect for fetchCatalogs triggered.');
    fetchCatalogs();
  }, [fetchCatalogs]);

  // --- Fetch Access Logs from Supabase ---
  const fetchAccessLogs = useCallback(async () => {
    // console.log(
    //   'DEBUG: fetchAccessLogs STARTING. catalogsReady:',
    //   catalogsReady,
    //   'loadingRoles:',
    //   loadingRoles,
    //   'loadingZonesList:',
    //   loadingZonesList,
    //   'loadingUserStatuses:',
    //   loadingUserStatuses,
    //   'loadingAllUsers:',
    //   loadingAllUsers
    // );
    if (!catalogsReady || loadingRoles || loadingZonesList || loadingUserStatuses || loadingAllUsers) {
      setLoadingAccessLogs(true);
      // console.log('DEBUG: fetchAccessLogs returning early because catalogs not ready or still loading.');
      return;
    }

    setLoadingAccessLogs(true);
    setErrorAccessLogs(null);
    try {
      const filter: AccessLogFilter = {
        dateFrom,
        dateTo,
        selectedLogDecisionId,
        selectedLogUserId,
        selectedLogZoneId,
        generalSearchTerm,
      };
      const result = await AccessLogService.getAccessLogs(
        filter,
        roles,
        userStatuses,
        zonesList
      );

      setAccessLogs(result || []);
      // console.log('DEBUG: fetchAccessLogs FINISHED successfully. Final filtered logs count:', result.length);
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
      setErrorAccessLogs(error.message || 'Failed to load access logs.');
    } finally {
      setLoadingAccessLogs(false);
    }
  }, [
    dateFrom,
    dateTo,
    selectedLogDecisionId,
    selectedLogUserId,
    selectedLogZoneId,
    generalSearchTerm,
    roles,
    zonesList,
    userStatuses,
    catalogsReady,
    loadingRoles,
    loadingZonesList,
    loadingUserStatuses,
    loadingAllUsers,
  ]);

  useEffect(() => {
    // console.log(
    //   'DEBUG: useEffect for fetchAccessLogs triggered. catalogsReady:',
    //   catalogsReady,
    //   'loadingRoles:',
    //   loadingRoles,
    //   'loadingZonesList:',
    //   loadingZonesList,
    //   'loadingUserStatuses:',
    //   loadingUserStatuses,
    //   'loadingAllUsers:',
    //   loadingAllUsers
    // );
    if (catalogsReady && !loadingRoles && !loadingZonesList && !loadingUserStatuses && !loadingAllUsers) {
      fetchAccessLogs();
    }
  }, [fetchAccessLogs, catalogsReady, loadingRoles, loadingZonesList, loadingUserStatuses, loadingAllUsers]);

  useEffect(() => {
    setLogCurrentPage(1);
  }, [generalSearchTerm, selectedLogUserId, selectedLogZoneId, selectedLogDecisionId, dateFrom, dateTo, logItemsPerPage]);

  const handleAIDetails = useCallback((log: DisplayLog) => {
    // console.log('AI Details for log (if needed):', log);
  }, []);

  // Nuevo manejador para abrir el modal de imagen
  const openImageModal = useCallback((imageUrl: string) => {
    setCurrentImageUrl(imageUrl);
    setImageModalOpen(true);
  }, []);

  const handleSummarySort = useCallback(
    (field: SummarySortField) => {
      if (summarySortField === field) {
        setSummarySortDirection(summarySortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC);
      } else {
        setSummarySortField(field);
        setSummarySortDirection(SortDirection.ASC);
      }
    },
    [summarySortField, summarySortDirection]
  );

  const sortedLogs = useMemo(() => {
    return [...accessLogs].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);

      let compareValue = 0;

      if (logSortField === 'timestamp') {
        compareValue = dateA.getTime() - dateB.getTime();
      } else if (logSortField === 'userName') {
        compareValue = a.userName.localeCompare(b.userName);
      } else if (logSortField === 'zoneName') {
        compareValue = a.zoneName.localeCompare(b.zoneName);
      } else if (logSortField === 'status') {
        compareValue = a.status.localeCompare(b.status);
      }

      return logSortDirection === SortDirection.ASC ? compareValue : -compareValue;
    });
  }, [accessLogs, logSortField, logSortDirection]);

  const logTotalPages = Math.ceil(sortedLogs.length / logItemsPerPage);
  const logStartIndex = (logCurrentPage - 1) * logItemsPerPage;
  const logEndIndex = logStartIndex + logItemsPerPage;
  const paginatedLogs = sortedLogs.slice(logStartIndex, logEndIndex);

  const userSummaryData = useMemo((): SummaryEntry[] => {
    const uniqueUsers = Array.from(new Set(accessLogs.map((log) => log.userName)));

    return uniqueUsers.map((userName) => {
      const userLogs = accessLogs.filter((log) => log.userName === userName);
      const successful = userLogs.filter((log) => log.status === LogDecision.ACCESS_GRANTED).length;
      const failed = userLogs.filter((log) => log.status === LogDecision.ACCESS_DENIED).length;
      const totalAccesses = userLogs.length;
      const successRate = totalAccesses > 0 ? (successful / totalAccesses) * 100 : 0;

      const timestamps = userLogs.map((log) => new Date(log.timestamp).getTime());
      const firstAccess = timestamps.length > 0 ? new Date(Math.min(...timestamps)).toLocaleString() : NA_VALUE;
      const lastAccess = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toLocaleString() : NA_VALUE;

      const zoneAccesses: Record<string, number> = userLogs.reduce((acc: Record<string, number>, log) => {
        acc[log.zoneName] = (acc[log.zoneName] || 0) + 1;
        return acc;
      }, {});

      return {
        user: userName,
        email: userLogs[0]?.userEmail || NA_VALUE,
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
          summaryStatusFilter === SELECT_ALL_VALUE
            ? true
            : summaryStatusFilter === 'successful'
              ? summary.successful > 0
              : summaryStatusFilter === 'failed'
                ? summary.failed > 0
                : true;
        return matchSearch && matchStatus;
      })
      .sort((a: SummaryEntry, b: SummaryEntry) => {
        let compareValue = 0;
        if (summarySortField === 'user') {
          compareValue = a.user.localeCompare(b.user);
        } else if (summarySortField === 'email') {
          compareValue = a.email.localeCompare(b.email);
        } else if (summarySortField === 'firstAccess') {
          compareValue = new Date(a.firstAccess).getTime() - new Date(b.firstAccess).getTime();
        } else if (summarySortField === 'lastAccess') {
          compareValue = new Date(a.lastAccess).getTime() - new Date(b.lastAccess).getTime();
        } else if (summarySortField === 'totalAccesses') {
          compareValue = a.totalAccesses - b.totalAccesses;
        } else if (summarySortField === 'successRate') {
          compareValue = a.successRate - b.successRate;
        }
        return summarySortDirection === SortDirection.ASC ? compareValue : -compareValue;
      });
  }, [userSummaryData, summarySortField, summarySortDirection, summarySearchTerm, summaryStatusFilter]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Access Logs</h2>
        <p className="text-indigo-200">Detailed history of all access attempts by registered users</p>
      </div>

      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filter Access Logs</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchAccessLogs}
                variant="outline"
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                disabled={loadingAccessLogs || !catalogsReady}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Refresh Logs
              </Button>
              <Button onClick={() => setSummaryModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Summary
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-50" />
            </div>

            <div className="space-y-2">
              <Label>User Name</Label>
              <Select value={selectedLogUserId} onValueChange={setSelectedLogUserId} disabled={loadingAccessLogs || !catalogsReady || loadingAllUsers}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL_VALUE}>All Users</SelectItem>
                  {allUsersForFilter.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Access Zone</Label>
              <Select value={selectedLogZoneId} onValueChange={setSelectedLogZoneId} disabled={loadingAccessLogs || !catalogsReady || loadingZonesList}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL_VALUE}>All Zones</SelectItem>
                  {zonesList.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedLogDecisionId} onValueChange={setSelectedLogDecisionId} disabled={loadingAccessLogs || !catalogsReady}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setGeneralSearchTerm(DEFAULT_FILTER_VALUES.generalSearchTerm);
                setDateFrom(DEFAULT_FILTER_VALUES.dateFrom);
                setDateTo(DEFAULT_FILTER_VALUES.dateTo);
                setSelectedLogUserId(SELECT_ALL_VALUE);
                setSelectedLogZoneId(SELECT_ALL_VALUE);
                setSelectedLogDecisionId(SELECT_ALL_VALUE);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

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
          {(loadingAccessLogs || !catalogsReady) && <div className="text-center py-4 text-gray-500">Loading access logs and catalogs...</div>}
          {errorAccessLogs && <div className="text-center py-4 text-red-500">Error loading logs: {errorAccessLogs}</div>}
          {!loadingAccessLogs && !errorAccessLogs && catalogsReady && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {LOG_COLUMNS.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`cursor-pointer hover:bg-gray-50 select-none`}
                        onClick={() => {
                          if (col.sortable) {
                            setLogSortDirection(
                              logSortField === col.key ? (logSortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC) : SortDirection.ASC
                            );
                            setLogSortField(col.key as LogSortField);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          {col.label}
                          {col.sortable &&
                            logSortField === col.key &&
                            (logSortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.profilePictureUrl ? (
                            <img
                              src={log.profilePictureUrl}
                              alt={log.userName || 'User'}
                              className="w-10 h-10 rounded-full object-cover cursor-pointer" // Añadir cursor-pointer
                              onClick={() => openImageModal(log.profilePictureUrl!)} // Abrir modal al hacer clic
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = IMAGE_FALLBACKS.PROFILE_PICTURE;
                              }}
                            />
                          ) : (
                            <UserCircle className="w-10 h-10 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell className="text-gray-600">{log.userEmail}</TableCell>
                        <TableCell>
                          <Badge variant={log.userRole === 'Admin' ? 'default' : 'secondary'}>{log.userRole}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={log.userStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {log.userStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {log.zoneName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.status === LogDecision.ACCESS_GRANTED ? 'default' : 'destructive'}
                            className={log.status === LogDecision.ACCESS_GRANTED ? 'bg-green-100 text-green-800' : ''}
                          >
                            {log.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={LOG_COLUMNS.length} className="text-center py-8 text-gray-500">
                        {generalSearchTerm ||
                        dateFrom ||
                        dateTo ||
                        selectedLogUserId !== SELECT_ALL_VALUE ||
                        selectedLogZoneId !== SELECT_ALL_VALUE ||
                        selectedLogDecisionId !== SELECT_ALL_VALUE
                          ? 'No logs found matching your filters.'
                          : 'No access logs for registered users found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <Select value={logItemsPerPage.toString()} onValueChange={(value) => setLogItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGINATION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
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
                      className={`w-8 h-8 p-0 ${logCurrentPage === page ? 'bg-teal-600 hover:bg-teal-700' : EMPTY_STRING}`}
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

      {/* Access Summary Modal (sin cambios relevantes para esta tarea) */}
      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Access Summary & Insights</DialogTitle>
            {/* <DialogDescription>Daily access summary for all users (Today: {new Date().toLocaleDateString()})</DialogDescription> */}
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">{Array.from(new Set(accessLogs.map((log: any) => log.userName))).length}</p>
                    <p className="text-sm text-gray-600">Active Users</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{accessLogs.filter((log: any) => log.status === 'access_granted').length}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="2xl font-bold text-red-600">{accessLogs.filter((log: any) => log.status === 'access_denied').length}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{Array.from(new Set(accessLogs.map((log: any) => log.zoneName))).length}</p>
                    <p className="text-sm text-gray-600">Zones Accessed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                        {SUMMARY_STATUS_FILTER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSummarySearchTerm(DEFAULT_FILTER_VALUES.summarySearchTerm);
                        setSummaryStatusFilter(DEFAULT_FILTER_VALUES.summaryStatusFilter);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                            (summarySortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('email')}>
                        <div className="flex items-center">
                          Email
                          {summarySortField === 'email' &&
                            (summarySortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('firstAccess')}>
                        <div className="flex items-center">
                          First Access
                          {summarySortField === 'firstAccess' &&
                            (summarySortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('lastAccess')}>
                        <div className="flex items-center">
                          Last Access
                          {summarySortField === 'lastAccess' &&
                            (summarySortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('totalAccesses')}>
                        <div className="flex items-center">
                          Total Accesses
                          {summarySortField === 'totalAccesses' &&
                            (summarySortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSummarySort('successRate')}>
                        <div className="flex items-center">
                          Success Rate
                          {summarySortField === 'successRate' &&
                            (summarySortDirection === SortDirection.ASC ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
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
                              variant={
                                summary.successRate >= SUCCESS_RATE_THRESHOLDS.HIGH
                                  ? 'default'
                                  : summary.successRate >= SUCCESS_RATE_THRESHOLDS.MEDIUM
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className={
                                summary.successRate >= SUCCESS_RATE_THRESHOLDS.HIGH
                                  ? 'bg-green-100 text-green-800'
                                  : summary.successRate >= SUCCESS_RATE_THRESHOLDS.MEDIUM
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : EMPTY_STRING
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
                          {summarySearchTerm || summaryStatusFilter !== SELECT_ALL_VALUE ? 'No users found matching your filters.' : 'No user data available.'}
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

      {/* AI Details Modal (sin cambios relevantes para esta tarea) */}
      <Dialog open={!!aiDetailsLog} onOpenChange={() => setAIDetailsLog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>AI Details for Log Entry</DialogTitle>
            <DialogDescription>Details for log entry at: {aiDetailsLog?.timestamp}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700">
            {aiDetailsLog &&
              Object.entries(aiDetailsLog).map(([key, value]) => (
                <div key={key}>
                  <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}:</strong> {JSON.stringify(value)}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setAIDetailsLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nuevo Modal para mostrar la imagen de perfil en grande */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          {' '}
          {/* Ajusta el tamaño máximo del modal */}
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
            <DialogDescription>
              Full size profile picture of {accessLogs.find((log) => log.profilePictureUrl === currentImageUrl)?.userName || 'the user'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center p-4">
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt="Profile Picture"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" // Estilos para la imagen grande
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = IMAGE_FALLBACKS.PROFILE_PICTURE_LARGE;
                }}
              />
            ) : (
              <div className="text-center text-gray-500">No image available.</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setImageModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessLogsTab;
