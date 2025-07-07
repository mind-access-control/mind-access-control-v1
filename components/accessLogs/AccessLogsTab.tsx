'use client'; // This line goes at the beginning if it's a Client Component
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Types Import ---
type Role = { id: string; name: string };
type UserStatus = { id: string; name: string };
type Zone = { id: string; name: string };
type UserForFilter = { id: string; full_name: string };

type Log = {
  id: string; // Log ID (UUID)
  timestamp: string;
  user_id: string | null; // Registered user ID
  observed_user_id: string | null; // Observed user ID
  camera_id: string | null;
  result: boolean; // Access granted/denied
  user_type: 'registered' | 'observed' | 'new_observed' | 'unknown' | null;
  match_status: string | null;
  decision: 'unknown' | 'access_granted' | 'access_denied' | 'error';
  reason: string;
  confidence_score: number | null;
  requested_zone_id: string | null;
  users: {
    full_name: string;
    role_id: string;
    status_id: string;
  } | null;
  zones: {
    name: string;
  } | null;
};

// Joined Log type for display in frontend
type DisplayLog = {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  userStatus: string;
  zoneName: string;
  status: string;
};

type SummaryEntry = {
  user: string;
  email: string;
  firstAccess: string;
  lastAccess: string;
  totalAccesses: number;
  successful: number;
  failed: number;
  successRate: number;
  zoneAccesses: Record<string, number>;
};

// --- Types for sorting and filtering ---
type LogSortField = 'timestamp' | 'userName' | 'zoneName' | 'status';
type SortDirection = 'asc' | 'desc';
type SummarySortField = 'user' | 'email' | 'firstAccess' | 'lastAccess' | 'totalAccesses' | 'successRate';

// Type for table columns
type Column = {
  key: string;
  label: string;
  sortable: boolean;
};

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
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, TrendingUp, RefreshCcw } from 'lucide-react';

// Supabase Client Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('DEBUG: SUPABASE_URL:', SUPABASE_URL ? 'Loaded' : 'UNDEFINED');
console.log('DEBUG: SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Loaded' : 'UNDEFINED');

const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

const AccessLogsTab: React.FC = () => {
  // --- Access Logs Filtering/Sorting States ---
  const [accessLogs, setAccessLogs] = useState<DisplayLog[]>([]);
  const [loadingAccessLogs, setLoadingAccessLogs] = useState(true);
  const [errorAccessLogs, setErrorAccessLogs] = useState<string | null>(null);

  const [generalSearchTerm, setGeneralSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLogUserId, setSelectedLogUserId] = useState('all');
  const [selectedLogZone, setSelectedLogZone] = useState('all');
  const [selectedLogStatus, setSelectedLogStatus] = useState('all');

  const [logSortField, setLogSortField] = useState<LogSortField>('timestamp');
  const [logSortDirection, setLogSortDirection] = useState<SortDirection>('desc');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState(10);

  // --- Summary Modal States ---
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summarySortField, setSummarySortField] = useState<SummarySortField>('user');
  const [summarySortDirection, setSummarySortDirection] = useState<SortDirection>('asc');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState('all');

  // --- AI Details Modal State (kept for potential future use, not used in main table) ---
  const [aiDetailsLog, setAIDetailsLog] = useState<any>(null);

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
    console.log('DEBUG: fetchCatalogs STARTING');
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
      const { data: rolesData, error: rolesError } = await supabase.from('roles_catalog').select('id, name');
      if (rolesError) throw rolesError;
      setRoles(rolesData || []);
      console.log('DEBUG: Roles Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      setErrorRoles(error.message || 'Failed to load roles.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingRoles(false);
    }

    try {
      const { data: zonesData, error: zonesError } = await supabase.from('zones').select('id, name');
      if (zonesError) throw zonesError;
      setZonesList(zonesData || []);
      console.log('DEBUG: Zones Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching zones:', error);
      setErrorZonesList(error.message || 'Failed to load zones.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingZonesList(false);
    }

    try {
      const { data: userStatusesData, error: userStatusesError } = await supabase.from('user_statuses_catalog').select('id, name');
      if (userStatusesError) throw userStatusesError;
      setUserStatuses(userStatusesData || []);
      console.log('DEBUG: User Statuses Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching user statuses:', error);
      setErrorUserStatuses(error.message || 'Failed to load user statuses.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingUserStatuses(false);
    }

    try {
      const { data: usersData, error: usersError } = await supabase.from('users').select('id, full_name');
      if (usersError) throw usersError;
      setAllUsersForFilter(usersData.filter((u) => u.full_name).map((u) => ({ id: u.id, full_name: u.full_name! })) || []);
      console.log('DEBUG: All Users for Filter Loaded Successfully.');
    } catch (error: any) {
      console.error('Error fetching all users for filter:', error);
      setErrorAllUsers(error.message || 'Failed to load all users for filter.');
      allCatalogsLoaded = false;
    } finally {
      setLoadingAllUsers(false);
    }

    setCatalogsReady(allCatalogsLoaded);
    console.log('DEBUG: fetchCatalogs FINISHED. catalogsReady:', allCatalogsLoaded);
  }, [supabase]);

  useEffect(() => {
    console.log('DEBUG: useEffect for fetchCatalogs triggered.');
    fetchCatalogs();
  }, [fetchCatalogs]);

  // --- Fetch Access Logs from Supabase ---
  const fetchAccessLogs = useCallback(async () => {
    console.log(
      'DEBUG: fetchAccessLogs STARTING. catalogsReady:',
      catalogsReady,
      'loadingRoles:',
      loadingRoles,
      'loadingZonesList:',
      loadingZonesList,
      'loadingUserStatuses:',
      loadingUserStatuses,
      'loadingAllUsers:',
      loadingAllUsers
    );
    if (!catalogsReady || loadingRoles || loadingZonesList || loadingUserStatuses || loadingAllUsers) {
      setLoadingAccessLogs(true);
      console.log('DEBUG: fetchAccessLogs returning early because catalogs not ready or still loading.');
      return;
    }

    setLoadingAccessLogs(true);
    setErrorAccessLogs(null);
    try {
      let query = supabase
        .from('logs')
        .select(
          `id,timestamp,user_id,observed_user_id,camera_id,result,user_type,match_status,decision,reason,confidence_score,requested_zone_id,users(full_name,role_id,status_id),zones(name)`
        )
        .not('user_id', 'is', null)
        .order('timestamp', { ascending: false });

      if (dateFrom) query = query.gte('timestamp', dateFrom);
      if (dateTo) query = query.lte('timestamp', dateTo);

      if (selectedLogStatus !== 'all') {
        query = query.eq('decision', selectedLogStatus);
      }

      if (selectedLogUserId !== 'all') {
        query = query.eq('user_id', selectedLogUserId);
      }

      console.log('DEBUG: selectedLogZone (name) for Supabase query:', selectedLogZone);
      if (selectedLogZone !== 'all') {
        // ¡CAMBIO CLAVE! Encontrar el ID de la zona seleccionada para filtrar por requested_zone_id
        const zoneToFilter = zonesList.find((zone) => zone.name === selectedLogZone);
        if (zoneToFilter) {
          console.log('DEBUG: Filtering by requested_zone_id:', zoneToFilter.id, 'for zone name:', selectedLogZone);
          query = query.eq('requested_zone_id', zoneToFilter.id);
        } else {
          // Si el nombre de la zona seleccionada no se encuentra en zonesList (ej. dato corrupto),
          // entonces no aplicar el filtro de zona o aplicar un filtro que no devuelva nada
          console.warn('WARNING: Selected zone name not found in zonesList:', selectedLogZone);
          // Para asegurar que no se muestre nada incorrecto, podemos forzar un filtro que no coincida
          query = query.eq('requested_zone_id', 'non-existent-id');
        }
      }

      const { data: rawLogs, error: logsError } = (await query) as {
        data:
          | (Log & {
              users: { full_name: string; role_id: string; status_id: string } | null;
              zones: { name: string } | null;
            })[]
          | null;
        error: any;
      };

      if (logsError) {
        console.error('Supabase Query Error:', logsError);
        throw logsError;
      }

      console.log('Raw Logs Data from Supabase (COMPLETE):', JSON.stringify(rawLogs, null, 2));

      const uniqueUserIds = Array.from(new Set((rawLogs || []).map((log) => log.user_id).filter(Boolean))) as string[];

      let userEmailsMap: Record<string, string> = {};

      if (uniqueUserIds.length > 0) {
        try {
          const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/get-user-emails`;

          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ userIds: uniqueUserIds }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Edge Function error: ${errorData.error || response.statusText}`);
          }

          const result = await response.json();
          userEmailsMap = result.emails;
        } catch (edgeError: any) {
          console.error('Error fetching emails via Edge Function:', edgeError);
        }
      }

      let processedLogs: DisplayLog[] = [];
      if (rawLogs) {
        processedLogs = rawLogs.map((log) => {
          console.log('Processing Log Entry ID:', log.id);
          console.log('DEBUG: log.users object for this entry:', log.users);
          console.log('DEBUG: log.requested_zone_id for this entry:', log.requested_zone_id);
          console.log('DEBUG: log.zones object (from Supabase join) for this entry:', log.zones);

          const userDetails = log.users;
          const userName = userDetails?.full_name || log.user_id || 'N/A';

          const userEmail = log.user_id ? userEmailsMap[log.user_id] || 'N/A' : 'N/A';

          const userRole = userDetails?.role_id ? roles.find((r) => r.id === userDetails.role_id)?.name || 'N/A' : 'N/A';

          const userStatus = userDetails?.status_id ? userStatuses.find((s) => s.id === userDetails.status_id)?.name || 'N/A' : 'N/A';

          // Priorizar log.zones?.name (de la unión), luego zonesList.find, luego requested_zone_id
          const zoneName =
            log.zones?.name || (log.requested_zone_id ? zonesList.find((z) => z.id === log.requested_zone_id)?.name || log.requested_zone_id : 'N/A');
          console.log('DEBUG: Resolved ZoneName for display:', zoneName);

          const status = log.decision;

          return {
            id: log.id,
            timestamp: new Date(log.timestamp).toLocaleString(),
            userId: log.user_id,
            userName: userName,
            userEmail: userEmail,
            userRole: userRole,
            userStatus: userStatus,
            zoneName: zoneName,
            status: status,
          };
        });
      }

      // ¡CAMBIO CLAVE! Filtro client-side como salvaguarda FINAL para la zona
      // Esto es crucial si el filtro de Supabase no es 100% estricto con los joins nulos
      const finalFilteredLogs = processedLogs.filter((log) => {
        const matchesZoneFilter = selectedLogZone === 'all' ? true : log.zoneName === selectedLogZone;

        const lowerCaseSearchTerm = generalSearchTerm.toLowerCase();
        const matchesSearch = generalSearchTerm
          ? log.userName.toLowerCase().includes(lowerCaseSearchTerm) ||
            log.userEmail.toLowerCase().includes(lowerCaseSearchTerm) ||
            log.userRole.toLowerCase().includes(lowerCaseSearchTerm) ||
            log.userStatus.toLowerCase().includes(lowerCaseSearchTerm) ||
            log.zoneName.toLowerCase().includes(lowerCaseSearchTerm) ||
            log.status.toLowerCase().includes(lowerCaseSearchTerm)
          : true;

        return matchesZoneFilter && matchesSearch;
      });

      setAccessLogs(finalFilteredLogs);
      console.log('DEBUG: fetchAccessLogs FINISHED successfully. Final filtered logs count:', finalFilteredLogs.length);
    } catch (error: any) {
      console.error('Error fetching access logs:', error);
      setErrorAccessLogs(error.message || 'Failed to load access logs.');
    } finally {
      setLoadingAccessLogs(false);
    }
  }, [
    supabase,
    dateFrom,
    dateTo,
    selectedLogStatus,
    selectedLogUserId,
    selectedLogZone, // Asegurarse de que este en las dependencias
    generalSearchTerm,
    roles,
    zonesList, // Asegurarse de que zonesList esté en las dependencias para el find
    userStatuses,
    catalogsReady,
    loadingRoles,
    loadingZonesList,
    loadingUserStatuses,
    loadingAllUsers,
  ]);

  useEffect(() => {
    console.log(
      'DEBUG: useEffect for fetchAccessLogs triggered. catalogsReady:',
      catalogsReady,
      'loadingRoles:',
      loadingRoles,
      'loadingZonesList:',
      loadingZonesList,
      'loadingUserStatuses:',
      loadingUserStatuses,
      'loadingAllUsers:',
      loadingAllUsers
    );
    if (catalogsReady && !loadingRoles && !loadingZonesList && !loadingUserStatuses && !loadingAllUsers) {
      fetchAccessLogs();
    }
  }, [fetchAccessLogs, catalogsReady, loadingRoles, loadingZonesList, loadingUserStatuses, loadingAllUsers]);

  useEffect(() => {
    setLogCurrentPage(1);
  }, [generalSearchTerm, selectedLogUserId, selectedLogZone, selectedLogStatus, dateFrom, dateTo, logItemsPerPage]);

  const handleAIDetails = useCallback((log: DisplayLog) => {
    console.log('AI Details for log (if needed):', log);
  }, []);

  const handleSummarySort = useCallback(
    (field: SummarySortField) => {
      if (summarySortField === field) {
        setSummarySortDirection(summarySortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSummarySortField(field);
        setSummarySortDirection('asc');
      }
    },
    [summarySortField, summarySortDirection]
  );

  const logColumns: Column[] = [
    { key: 'timestamp', label: 'Timestamp', sortable: true },
    { key: 'userName', label: 'User Name', sortable: true },
    { key: 'userEmail', label: 'User Email', sortable: false },
    { key: 'userRole', label: 'User Role', sortable: false },
    { key: 'userStatus', label: 'User Status', sortable: false },
    { key: 'zoneName', label: 'Zone', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

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

      return logSortDirection === 'asc' ? compareValue : -compareValue;
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
      const successful = userLogs.filter((log) => log.status === 'access_granted').length;
      const failed = userLogs.filter((log) => log.status === 'access_denied').length;
      const totalAccesses = userLogs.length;
      const successRate = totalAccesses > 0 ? (successful / totalAccesses) * 100 : 0;

      const timestamps = userLogs.map((log) => new Date(log.timestamp).getTime());
      const firstAccess = timestamps.length > 0 ? new Date(Math.min(...timestamps)).toLocaleString() : 'N/A';
      const lastAccess = timestamps.length > 0 ? new Date(Math.max(...timestamps)).toLocaleString() : 'N/A';

      const zoneAccesses: Record<string, number> = userLogs.reduce((acc: Record<string, number>, log) => {
        acc[log.zoneName] = (acc[log.zoneName] || 0) + 1;
        return acc;
      }, {});

      return {
        user: userName,
        email: userLogs[0]?.userEmail || 'N/A',
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
        return summarySortDirection === 'asc' ? compareValue : -compareValue;
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
                  <SelectItem value="all">All Users</SelectItem>
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
              <Select value={selectedLogZone} onValueChange={setSelectedLogZone} disabled={loadingAccessLogs || !catalogsReady || loadingZonesList}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  {/* ¡CAMBIO CLAVE! Corregido a "All Zones" */}
                  <SelectItem value="all">All Zones</SelectItem>
                  {zonesList.map((zone) => (
                    <SelectItem key={zone.id} value={zone.name}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedLogStatus} onValueChange={setSelectedLogStatus} disabled={loadingAccessLogs || !catalogsReady}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="access_granted">Access Granted</SelectItem>
                  <SelectItem value="access_denied">Access Denied</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setGeneralSearchTerm('');
                setDateFrom('');
                setDateTo('');
                setSelectedLogUserId('all');
                setSelectedLogZone('all');
                setSelectedLogStatus('all');
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
                    {logColumns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`cursor-pointer hover:bg-gray-50 select-none`}
                        onClick={() => {
                          if (col.sortable) {
                            setLogSortDirection(logSortField === col.key ? (logSortDirection === 'asc' ? 'desc' : 'asc') : 'asc');
                            setLogSortField(col.key as LogSortField);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          {col.label}
                          {col.sortable &&
                            logSortField === col.key &&
                            (logSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length > 0 ? (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
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
                            variant={log.status === 'access_granted' ? 'default' : 'destructive'}
                            className={log.status === 'access_granted' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {log.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={logColumns.length} className="text-center py-8 text-gray-500">
                        {generalSearchTerm || dateFrom || dateTo || selectedLogUserId !== 'all' || selectedLogZone !== 'all' || selectedLogStatus !== 'all'
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

      <Dialog open={summaryModalOpen} onOpenChange={setSummaryModalOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Access Summary & Insights</DialogTitle>
            <DialogDescription>Daily access summary for all users (Today: {new Date().toLocaleDateString()})</DialogDescription>
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
    </div>
  );
};

export default AccessLogsTab;
