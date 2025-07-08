'use client'; // Esta línea va al inicio si es un Client Component
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

// --- Mock Data Import ---
import {
  aiRecommendations as mockAiRecommendations,
  kpiData as mockKpiData,
  riskScore as mockRiskScore,
  suspiciousUsers as mockSuspiciousUsers,
  PIE_COLORS, // Aunque PIE_COLORS no se usará aquí, lo mantengo por si lo usas en otro lugar
  tabs,
} from '@/mock-data';

// --- Shadcn UI Components ---
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// --- Lucide React Icons ---
import { AlertCircle, AlertTriangle, ArrowRight, Lightbulb, LogOut, Shield, TrendingUp, UserCircle2, Users, Zap } from 'lucide-react';

// --- Custom Hooks & Components ---
import { userAuthActions } from '@/hooks/auth.hooks';

// --- Recharts (for AI-Enhanced Dashboard) ---
// No necesitamos importar Recharts aquí si los gráficos están en componentes separados
// import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';

// --- IMPORTAR NUEVOS COMPONENTES REFACTORIZADOS ---
import ObservedUsersTab from '@/components/observedUsers/ObservedUsersTab';
import DetailedObservedLogsTab from '@/components/observedUsersLogs/DetailedObservedLogsTab';
import AccessLogsTab from './accessLogs/AccessLogsTab';
import SettingsTab from './settings/SettingsTab';
import UsersTab from './users/UsersTab';
// ¡CAMBIO CLAVE! Importar el nuevo componente AnalyticsTab
import AnalyticsTab from '@/components/analytics/AnalyticsTab';

export default function AdminDashboard({ supabase, session, onLogout }: { supabase?: SupabaseClient; session?: Session; onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { signOut } = userAuthActions();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  // --- AI-ENHANCED DASHBOARD STATE & DATA (Inicializados como arrays/objetos vacíos) ---
  const [riskScore] = useState(mockRiskScore);
  const [kpiData] = useState(mockKpiData);
  const [suspiciousUsers, setSuspiciousUsers] = useState(mockSuspiciousUsers);
  const [aiRecommendations, setAIRecommendations] = useState(mockAiRecommendations);
  // Eliminamos trendData y failureCauseData de aquí, ahora los maneja AnalyticsTab
  // const [trendData] = useState<any[]>([]);
  // const [failureCauseData] = useState<any[]>([]);
  const [aiDetailsUser, setAIDetailsUser] = useState<any>(null);
  const [aiDetailsLog, setAIDetailsLog] = useState<any>(null);
  const [aiRecDetails, setAIRecDetails] = useState<any>(null);
  const [dashboardTab, setDashboardTab] = useState('overview');

  // --- OTRAS FUNCIONES ---
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await signOut();

      if (error) {
        console.error('Error from auth hook signOut:', error);

        if (supabase) {
          try {
            const { error: directError } = await supabase.auth.signOut();
            if (directError) {
              console.error('Direct signOut also failed:', directError);
            }
          } catch (directError) {
            console.error('Exception during direct signOut:', directError);
          }
        }
      }
    } catch (error) {
      console.error('Error during logout process:', error);
    } finally {
      setIsLoggingOut(false);
      router.push('/');
    }
  };

  // --- COMPONENTES AUXILIARES DE UI (Implementaciones básicas) ---
  // Mantenemos estas funciones aquí ya que son usadas por el dashboard 'overview'
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

  // Eliminamos SecurityTrendsChart y FailureCauseChart de aquí
  // function SecurityTrendsChart({ data }: { data: any[] }) { ... }
  // function FailureCauseChart({ data }: { data: any[] }) { ... }

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
                  { id: 'detailed-logs', label: 'Detailed Observed Logs' },
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
            {dashboardTab === 'detailed-logs' && <DetailedObservedLogsTab />}

            {/* Analytics Tab - ¡CAMBIO CLAVE! Usar el nuevo componente */}
            {dashboardTab === 'analytics' && <AnalyticsTab />}

            {/* AI Details Modals (keep these always available) */}
            <AIDetailsModal open={!!aiDetailsUser} onClose={() => setAIDetailsUser(null)} details={aiDetailsUser} />
            <AIDetailsModal open={!!aiDetailsLog} onClose={() => setAIDetailsLog(null)} details={aiDetailsLog} />
            <AIDetailsModal open={!!aiRecDetails} onClose={() => setAIRecDetails(null)} details={aiRecDetails} />
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && <UsersTab />}

        {/* Access Logs Tab */}
        {activeTab === 'logs' && <AccessLogsTab />}

        {/* Settings Tab */}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
