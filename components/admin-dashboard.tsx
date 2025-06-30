'use client'; // Esta línea va al inicio si es un Client Component
import { Session, SupabaseClient } from '@supabase/supabase-js'; // Importa el cliente de Supabase JS
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

// --- Types Import ---
import type { LogSortField, SortDirection, SummaryEntry, SummarySortField } from '@/types';

// --- Mock Data Import ---
import {
  accessLogs,
  defaultNewCamera,
  logColumns,
  aiRecommendations as mockAiRecommendations,
  cameras as mockCameras,
  kpiData as mockKpiData,
  riskScore as mockRiskScore,
  suspiciousUsers as mockSuspiciousUsers,
  zones as mockZones,
  PIE_COLORS,
  tabs,
} from '@/mock-data';

// --- Shadcn UI Components ---
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Lucide React Icons ---
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Edit,
  FileSpreadsheet,
  Lightbulb,
  LogOut,
  Save,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  UserCircle2,
  Users,
  X,
  Zap,
} from 'lucide-react';

// --- Custom Hooks & Components ---
import { userAuthActions } from '@/hooks/auth.hooks';

// --- Recharts (for AI-Enhanced Dashboard) ---
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import UsersTab from './users/UsersTab';
import ObservedUsersTab from '@/components/ObservedUsersTab';

export default function AdminDashboard({ supabase, session, onLogout }: { supabase?: SupabaseClient; session?: Session; onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { signOut } = userAuthActions(); 
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Estado para el logout
  const router = useRouter();

  // --- Dashboard Filtering/Sorting States (mantener tus existentes) ---
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [logSortField, setLogSortField] = useState<LogSortField>('timestamp');
  const [logSortDirection, setLogSortDirection] = useState<SortDirection>('desc');
  const [logCurrentPage, setLogCurrentPage] = useState(1);
  const [logItemsPerPage, setLogItemsPerPage] = useState(10);
  const [summarySortField, setSummarySortField] = useState<SummarySortField>('user');
  const [summarySortDirection, setSummarySortDirection] = useState<SortDirection>('asc');
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState('all');
  const [activeSettingsTab, setActiveSettingsTab] = useState('zones');
  const [zones, setZones] = useState(mockZones);
  const [cameras, setCameras] = useState(mockCameras);
  const [newZoneName, setNewZoneName] = useState('');
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [editingZoneName, setEditingZoneName] = useState('');
  const [zoneToDelete, setZoneToDelete] = useState<any>(null);
  const [zoneDeleteModalOpen, setZoneDeleteModalOpen] = useState(false);
  const [newCamera, setNewCamera] = useState(defaultNewCamera);
  const [editingCameraId, setEditingCameraId] = useState<number | null>(null);
  const [editingCamera, setEditingCamera] = useState<any>(null);
  const [cameraToDelete, setCameraToDelete] = useState<any>(null);
  const [cameraDeleteModalOpen, setCameraDeleteModalOpen] = useState(false);
  // Search term para los Access Logs (faltante)
  const [searchTerm, setSearchTerm] = useState('');
  // --- AI-ENHANCED DASHBOARD STATE & DATA (Inicializados como arrays/objetos vacíos) ---
  const [riskScore] = useState(mockRiskScore);
  const [kpiData] = useState(mockKpiData);
  const [suspiciousUsers, setSuspiciousUsers] = useState(mockSuspiciousUsers);
  const [aiRecommendations, setAIRecommendations] = useState(mockAiRecommendations);
  const [recentLogs, setRecentLogs] = useState<any[]>([]); // Inicializado
  const [trendData] = useState<any[]>([]); // Inicializado
  const [failureCauseData] = useState<any[]>([]); // Inicializado
  const [aiDetailsUser, setAIDetailsUser] = useState<any>(null); // Tipado más específico
  const [aiDetailsLog, setAIDetailsLog] = useState<any>(null); // Tipado más específico
  const [aiRecDetails, setAIRecDetails] = useState<any>(null); // Tipado más específico
  const [logsSortField, setLogsSortField] = useState<LogSortField>('timestamp');
  const [logsSortDirection, setLogsSortDirection] = useState<SortDirection>('desc');
  const [dashboardTab, setDashboardTab] = useState('overview');

  // --- OTRAS FUNCIONES ---
  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogSort = (field: LogSortField) => {
    if (logSortField === field) {
      setLogSortDirection(logSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setLogSortField(field);
      setLogSortDirection('asc');
    }
  };

  const handleSummarySort = (field: SummarySortField) => {
    if (summarySortField === field) {
      setSummarySortDirection(summarySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSummarySortField(field);
      setSummarySortDirection('asc');
    }
  };

  const handleAddZone = () => {
    if (newZoneName.trim()) {
      setZones((prev) => [...prev, { id: prev.length + 1, name: newZoneName.trim() }]);
      setNewZoneName('');
    }
  };

  const startEditingZone = (zone: any) => {
    setEditingZoneId(zone.id);
    setEditingZoneName(zone.name);
  };

  const cancelEditingZone = () => {
    setEditingZoneId(null);
    setEditingZoneName('');
  };

  const saveEditingZone = () => {
    setZones((prev) => prev.map((zone) => (zone.id === editingZoneId ? { ...zone, name: editingZoneName.trim() } : zone)));
    cancelEditingZone();
  };

  const openZoneDeleteModal = (zone: any) => {
    setZoneToDelete(zone);
    setZoneDeleteModalOpen(true);
  };

  const confirmZoneDelete = () => {
    setZones((prev) => prev.filter((zone) => zone.id !== zoneToDelete.id));
    setCameras((prev) => prev.map((cam) => (cam.zone === zoneToDelete.name ? { ...cam, zone: '' } : cam))); // Unassign cameras
    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  const cancelZoneDelete = () => {
    setZoneDeleteModalOpen(false);
    setZoneToDelete(null);
  };

  const handleAddCamera = () => {
    if (newCamera.name.trim() && newCamera.zone) {
      setCameras((prev) => [...prev, { id: prev.length + 1, ...newCamera }]);
      setNewCamera({ name: '', zone: '', location: '' });
    }
  };

  const startEditingCamera = (camera: any) => {
    setEditingCameraId(camera.id);
    setEditingCamera({ ...camera });
  };

  const cancelEditingCamera = () => {
    setEditingCameraId(null);
    setEditingCamera(null);
  };

  const saveEditingCamera = () => {
    setCameras((prev) => prev.map((camera) => (camera.id === editingCameraId ? { ...editingCamera } : camera)));
    cancelEditingCamera();
  };

  const openCameraDeleteModal = (camera: any) => {
    setCameraToDelete(camera);
    setCameraDeleteModalOpen(true);
  };

  const confirmCameraDelete = () => {
    setCameras((prev) => prev.filter((camera) => camera.id !== cameraToDelete.id));
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  const cancelCameraDelete = () => {
    setCameraDeleteModalOpen(false);
    setCameraToDelete(null);
  };

  const filteredLogs = useMemo(() => {
    return (accessLogs as any[]).filter((log) => {
      const matchSearch = searchTerm ? JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase()) : true;
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
  }, [searchTerm, selectedUser, selectedZone, selectedStatus, selectedMethod, dateFrom, dateTo, accessLogs]);

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

  const logTotalPages = Math.ceil(sortedLogs.length / logItemsPerPage);
  const logStartIndex = (logCurrentPage - 1) * logItemsPerPage;
  const logEndIndex = logStartIndex + logItemsPerPage;
  const paginatedLogs = sortedLogs.slice(logStartIndex, logEndIndex);

  const sortedRecentLogs = useMemo(() => {
    return (accessLogs as any[]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  }, [accessLogs]);

  // --- Reset Pagination on Filter Change ---
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, itemsPerPage]);

  useEffect(() => {
    setLogCurrentPage(1);
  }, [searchTerm, selectedUser, selectedZone, selectedStatus, selectedMethod, dateFrom, dateTo]);

  // --- COMPONENTES AUXILIARES DE UI (Implementaciones básicas) ---
  function RiskScoreCard({ score, status }: { score: number; status: 'low' | 'moderate' | 'high' }) {
    const statusColor = status === 'low' ? 'text-green-500' : status === 'moderate' ? 'text-yellow-500' : 'text-red-500';
    const bgColor = status === 'low' ? 'bg-green-50' : status === 'moderate' ? 'bg-yellow-50' : 'bg-red-50';
    const borderColor = status === 'low' ? 'border-green-200' : status === 'moderate' ? 'border-yellow-200' : 'border-red-200';

    return (
      <div className={`rounded-xl shadow-lg p-6 flex flex-col items-center border ${borderColor} ${bgColor}`}>
        <Lightbulb className={`w-10 h-10 mb-2 ${statusColor}`} />
        <div className="text-sm text-gray-600 mb-1">Overall Risk Score</div>
        <div className={`text-4xl font-bold ${statusColor}`}>{score}</div>
        <Badge className={`mt-2 ${bgColor} border ${borderColor} text-gray-800`}>{status.charAt(0).toUpperCase() + status.slice(1)} Risk</Badge>
      </div>
    );
  }

  function KpiCard({
    icon,
    label,
    value,
    highlight = false,
    alert = false,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
    alert?: boolean;
  }) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 flex flex-col items-center ${highlight ? 'border-2 border-teal-500' : ''}`}>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
            alert ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {icon}
        </div>
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        <div className="text-3xl font-bold text-gray-800">{value}</div>
      </div>
    );
  }

  function SecurityAlertCard({ count }: { count: number }) {
    return <KpiCard icon={<AlertTriangle className="w-8 h-8" />} label="Active Alerts" value={count} alert={count > 0} highlight={count > 0} />;
  }

  function SuspiciousUserList({ users, onDetails }: { users: any[]; onDetails: (user: any) => void }) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" /> Suspicious Activities Detected
        </div>
        {users.length > 0 ? (
          <ul className="space-y-3">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <UserCircle2 className="w-6 h-6 text-red-500 mr-2" />
                  <div>
                    <div className="font-medium text-red-800">{user.name}</div>
                    <div className="text-sm text-red-600">{user.reason}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onDetails(user)}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No suspicious activities at this time.</p>
        )}
      </Card>
    );
  }

  function AIRecommendationList({ recommendations, onAction }: { recommendations: any[]; onAction: (rec: any) => void }) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-500" /> AI-Suggested Actions
        </div>
        {recommendations.length > 0 ? (
          <ul className="space-y-3">
            {recommendations.map((rec) => (
              <li key={rec.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <div className="font-medium text-blue-800">{rec.action}</div>
                  <div className="text-sm text-blue-600">{rec.details}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onAction(rec)}>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No AI recommendations currently.</p>
        )}
      </Card>
    );
  }

  function AccessLogTable({
    logs,
    onAIDetails,
    logsSortField,
    logsSortDirection,
    setLogsSortField,
    setLogsSortDirection,
  }: {
    logs: any[];
    onAIDetails: (log: any) => void;
    logsSortField: LogSortField;
    logsSortDirection: SortDirection;
    setLogsSortField: React.Dispatch<React.SetStateAction<LogSortField>>;
    setLogsSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  }) {
    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-purple-500" /> Recent Access Logs
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {logColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`cursor-pointer hover:bg-gray-50 select-none`}
                    onClick={() => col.sortable && setLogsSortField(col.key as LogSortField)}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {col.sortable &&
                        logsSortField === col.key &&
                        (logsSortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
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
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => onAIDetails(log)}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={logColumns.length} className="text-center py-8 text-gray-500">
                    No recent access logs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  }

  function SecurityTrendsChart({ data }: { data: any[] }) {
    const chartData =
      data.length > 0
        ? data
        : [
            { name: 'Mon', success: 4000, failed: 2400 },
            { name: 'Tue', success: 3000, failed: 1398 },
            { name: 'Wed', success: 2000, failed: 9800 },
            { name: 'Thu', success: 2780, failed: 3908 },
            { name: 'Fri', success: 1890, failed: 4800 },
            { name: 'Sat', success: 2390, failed: 3800 },
            { name: 'Sun', success: 3490, failed: 4300 },
          ];

    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" /> Security Trends (Weekly)
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
            <YAxis tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 text-center mt-2">Daily successful vs. failed access attempts.</p>
      </Card>
    );
  }

  function FailureCauseChart({ data }: { data: any[] }) {
    const chartData =
      data.length > 0
        ? data
        : [
            { name: 'Incorrect Face', value: 400 },
            { name: 'Access Denied', value: 300 },
            { name: 'Invalid Zone', value: 300 },
            { name: 'System Error', value: 200 },
          ];

    return (
      <Card className="bg-white rounded-xl shadow-lg p-4">
        <div className="font-semibold text-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-500" /> Top Failure Causes
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 text-center mt-2">Distribution of common reasons for failed access.</p>
      </Card>
    );
  }

  function AIDetailsModal({ open, onClose, details }: { open: boolean; onClose: () => void; details: any }) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>AI Details</DialogTitle>
            <DialogDescription>
              {details?.type === 'user' && `Insights for user: ${details.name}`}
              {details?.type === 'log' && `Details for log entry at: ${details.timestamp}`}
              {details?.type === 'recommendation' && `Recommendation: ${details.action}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-gray-700">
            {details &&
              Object.entries(details).map(([key, value]) => (
                <div key={key}>
                  <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}:</strong> {JSON.stringify(value)}
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
                <div className="w-4 h-4 bg-white rounded opacity-90"></div>
              </div>
              <h1 className="text-xl font-bold text-white">Access Control System</h1>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="text-white hover:bg-white/10" disabled={isLoggingOut}>
              {isLoggingOut ? (
                <>Loading...</>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-teal-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Secondary Tab Navigation */}
            <div className="mb-6">
              <nav className="flex space-x-6">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'observed', label: 'Observed Users' },
                  { id: 'logs', label: 'Detailed Logs' },
                  { id: 'analytics', label: 'Analytics' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardTab(tab.id)}
                    className={`text-sm font-medium transition-colors duration-200 ${
                      dashboardTab === tab.id ? 'text-green-400 border-b-2 border-green-400 pb-1 font-semibold' : 'text-purple-200 hover:text-purple-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Overview Tab */}
            {dashboardTab === 'overview' && (
              <>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Facial Access Control Dashboard - Security Overview</h2>
                  <p className="text-indigo-200">AI-powered insights for proactive security management</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  <div className="col-span-1">
                    <RiskScoreCard score={riskScore.score} status={riskScore.status} />
                  </div>
                  <KpiCard icon={<Users className="w-8 h-8" />} label="Total Users" value={kpiData.totalUsers} />
                  <KpiCard icon={<Shield className="w-8 h-8" />} label="Active Zones" value={kpiData.activeZones} />
                  <KpiCard icon={<Zap className="w-8 h-8" />} label="Accesses Today" value={kpiData.accessesToday} />
                  <SecurityAlertCard count={kpiData.activeAlerts} />
                  <KpiCard
                    icon={<AlertTriangle className="w-8 h-8 text-yellow-500" />}
                    label="Anomalous Attempts (AI)"
                    value={kpiData.anomalousAttempts}
                    highlight={kpiData.anomalousAttempts > 0}
                  />
                  <KpiCard icon={<TrendingUp className="w-8 h-8" />} label="Success Rate" value={`${kpiData.successRate}%`} />
                </div>
                {/* Anomalous Events & AI Suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SuspiciousUserList users={suspiciousUsers} onDetails={setAIDetailsUser} />
                  <AIRecommendationList recommendations={aiRecommendations} onAction={setAIRecDetails} />
                </div>
              </>
            )}

            {/* Observed Users Tab */}
            {dashboardTab === 'observed' && <ObservedUsersTab />}

            {/* Detailed Logs Tab */}
            {dashboardTab === 'logs' && (
              <AccessLogTable
                logs={sortedRecentLogs}
                onAIDetails={setAIDetailsLog}
                logsSortField={logsSortField}
                logsSortDirection={logsSortDirection}
                setLogsSortField={setLogsSortField}
                setLogsSortDirection={setLogsSortDirection}
              />
            )}

            {/* Analytics Tab */}
            {dashboardTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SecurityTrendsChart data={trendData} />
                <FailureCauseChart data={failureCauseData} />
              </div>
            )}

            {/* AI Details Modals (keep these always available) */}
            <AIDetailsModal open={!!aiDetailsUser} onClose={() => setAIDetailsUser(null)} details={aiDetailsUser} />
            <AIDetailsModal open={!!aiDetailsLog} onClose={() => setAIDetailsLog(null)} details={aiDetailsLog} />
            <AIDetailsModal open={!!aiRecDetails} onClose={() => setAIRecDetails(null)} details={aiRecDetails} />
          </div>
        )}

        {/* User Management Tab - ENHANCED */}
        {activeTab === 'users' && <UsersTab />}

        {/* Access Logs Tab - ENHANCED WITH SORTING AND PAGINATION */}
        {activeTab === 'logs' && (
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
                    <Input placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
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
                            {searchTerm ||
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
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
              <p className="text-indigo-200">System configuration and management</p>
            </div>

            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="zones" value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="zones">Zone Management</TabsTrigger>
                    <TabsTrigger value="cameras">Camera Management</TabsTrigger>
                  </TabsList>

                  {/* Zone Management Tab */}
                  <TabsContent value="zones" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Zone Management</h3>
                      <p className="text-gray-600 mb-4">
                        Define and manage access zones for your facility. Each zone can have multiple cameras assigned to it.
                      </p>
                    </div>

                    {/* Add New Zone Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Add New Zone</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label htmlFor="zoneName">Zone Name</Label>
                            <Input
                              id="zoneName"
                              placeholder="Enter zone name"
                              value={newZoneName}
                              onChange={(e) => setNewZoneName(e.target.value)}
                              className="bg-slate-50"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button onClick={handleAddZone} className="bg-teal-600 hover:bg-teal-700" disabled={!newZoneName.trim()}>
                              Add Zone
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Existing Zones Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Existing Zones</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Zone Name</TableHead>
                              <TableHead className="w-[200px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {zones.length > 0 ? (
                              zones.map((zone) => (
                                <TableRow key={zone.id}>
                                  <TableCell>
                                    {editingZoneId === zone.id ? (
                                      <Input value={editingZoneName} onChange={(e) => setEditingZoneName(e.target.value)} className="h-8" />
                                    ) : (
                                      zone.name
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {editingZoneId === zone.id ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={saveEditingZone}
                                            className="text-green-600 hover:text-green-700"
                                            disabled={!editingZoneName.trim()}
                                          >
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={cancelEditingZone} className="text-gray-600 hover:text-gray-700">
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button size="sm" variant="outline" onClick={() => startEditingZone(zone)}>
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openZoneDeleteModal(zone)}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                                  No zones defined. Add your first zone above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Camera Management Tab */}
                  <TabsContent value="cameras" className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Camera Management</h3>
                      <p className="text-gray-600 mb-4">Manage cameras and assign them to specific access zones. Each camera can be assigned to one zone.</p>
                    </div>

                    {/* Add New Camera Form */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Add New Camera</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label htmlFor="cameraName">Camera Name</Label>
                            <Input
                              id="cameraName"
                              placeholder="Enter camera name"
                              value={newCamera.name}
                              onChange={(e) =>
                                setNewCamera({
                                  ...newCamera,
                                  name: e.target.value,
                                })
                              }
                              className="bg-slate-50"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cameraZone">Zone</Label>
                            <Select value={newCamera.zone} onValueChange={(value) => setNewCamera({ ...newCamera, zone: value })}>
                              <SelectTrigger id="cameraZone" className="bg-slate-50">
                                <SelectValue placeholder="Select zone" />
                              </SelectTrigger>
                              <SelectContent>
                                {zones.map((zone) => (
                                  <SelectItem key={zone.id} value={zone.name}>
                                    {zone.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="cameraLocation">Location (Optional)</Label>
                            <Input
                              id="cameraLocation"
                              placeholder="Describe camera location"
                              value={newCamera.location}
                              onChange={(e) =>
                                setNewCamera({
                                  ...newCamera,
                                  location: e.target.value,
                                })
                              }
                              className="bg-slate-50"
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddCamera} className="bg-teal-600 hover:bg-teal-700" disabled={!newCamera.name.trim() || !newCamera.zone}>
                          Add Camera
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Existing Cameras Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Existing Cameras</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Camera Name</TableHead>
                              <TableHead>Zone</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead className="w-[200px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cameras.length > 0 ? (
                              cameras.map((camera) => (
                                <TableRow key={camera.id}>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Input
                                        value={editingCamera.name}
                                        onChange={(e) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            name: e.target.value,
                                          })
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      camera.name
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Select
                                        value={editingCamera.zone}
                                        onValueChange={(value) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            zone: value,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {zones.map((zone) => (
                                            <SelectItem key={zone.id} value={zone.name}>
                                              {zone.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                        {camera.zone || 'Unassigned'}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingCameraId === camera.id ? (
                                      <Input
                                        value={editingCamera.location}
                                        onChange={(e) =>
                                          setEditingCamera({
                                            ...editingCamera,
                                            location: e.target.value,
                                          })
                                        }
                                        className="h-8"
                                      />
                                    ) : (
                                      camera.location || '-'
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {editingCameraId === camera.id ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={saveEditingCamera}
                                            className="text-green-600 hover:text-green-700"
                                            disabled={!editingCamera.name.trim() || !editingCamera.zone}
                                          >
                                            <Save className="w-4 h-4" />
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={cancelEditingCamera} className="text-gray-600 hover:text-gray-700">
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button size="sm" variant="outline" onClick={() => startEditingCamera(camera)}>
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openCameraDeleteModal(camera)}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                  No cameras defined. Add your first camera above.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* --- OTROS MODALES --- */}
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

      {/* Zone Delete Confirmation Modal */}
      <Dialog open={zoneDeleteModalOpen} onOpenChange={setZoneDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the zone <strong>{zoneToDelete?.name}</strong>? This action cannot be undone.
              {cameras.some((camera) => camera.zone === zoneToDelete?.name) && (
                <div className="mt-2 text-red-600">Warning: This zone has cameras assigned to it. Deleting this zone will unassign these cameras.</div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelZoneDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmZoneDelete} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Delete Confirmation Modal */}
      <Dialog open={cameraDeleteModalOpen} onOpenChange={setCameraDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the camera <strong>{cameraToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelCameraDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmCameraDelete} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
