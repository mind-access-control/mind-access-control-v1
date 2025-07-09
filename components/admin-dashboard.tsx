'use client'; // Esta línea va al inicio si es un Client Component
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

// --- Mock Data Import (solo para tabs si no se manejan dinámicamente) ---
// Eliminamos los mocks de kpiData, riskScore, suspiciousUsers, aiRecommendations
// ya que ahora OverviewTab los manejará directamente desde Supabase.
import { tabs } from '@/mock-data';

// --- Shadcn UI Components ---
import { Button } from '@/components/ui/button';
// Eliminamos Dialog de aquí, ahora AIDetailsModal lo encapsula
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// --- Lucide React Icons ---
import { LogOut } from 'lucide-react'; // Solo necesitamos LogOut aquí

// --- Custom Hooks & Components ---
import { userAuthActions } from '@/hooks/auth.hooks';

// --- IMPORTAR NUEVOS COMPONENTES REFACTORIZADOS ---
import ObservedUsersTab from '@/components/observedUsers/ObservedUsersTab';
import DetailedObservedLogsTab from '@/components/observedUsersLogs/DetailedObservedLogsTab';
import AccessLogsTab from './accessLogs/AccessLogsTab';
import SettingsTab from './settings/SettingsTab';
import UsersTab from './users/UsersTab';
import AnalyticsTab from '@/components/analytics/AnalyticsTab';
// ¡CAMBIO CLAVE! Importar el nuevo componente OverviewTab
import OverviewTab from '@/components/dashboard/OverviewTab';

export default function AdminDashboard({ supabase, session, onLogout }: { supabase?: SupabaseClient; session?: Session; onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { signOut } = userAuthActions();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  // Eliminamos todos los estados de mock data y AI details de aquí,
  // ahora son manejados dentro de OverviewTab o sus hijos.
  // const [riskScore] = useState(mockRiskScore);
  // const [kpiData] = useState(mockKpiData);
  // const [suspiciousUsers, setSuspiciousUsers] = useState(mockSuspiciousUsers);
  // const [aiRecommendations, setAIRecommendations] = useState(mockAiRecommendations);
  // const [aiDetailsUser, setAIDetailsUser] = useState<any>(null);
  // const [aiDetailsLog, setAIDetailsLog] = useState<any>(null);
  // const [aiRecDetails, setAIRecDetails] = useState<any>(null);
  const [dashboardTab, setDashboardTab] = useState('overview'); // Este estado controla la sub-navegación dentro del dashboard

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

  // Eliminamos los componentes auxiliares de UI (RiskScoreCard, KpiCard, etc.)
  // ya que ahora son componentes separados importados por OverviewTab.
  // function RiskScoreCard(...) { ... }
  // function KpiCard(...) { ... }
  // function SecurityAlertCard(...) { ... }
  // function SuspiciousUserList(...) { ... }
  // function AIRecommendationList(...) { ... }
  // function AIDetailsModal(...) { ... } // Este se movió a components/dashboard/modals

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

            {/* Overview Tab - ¡CAMBIO CLAVE! Usar el nuevo componente */}
            {dashboardTab === 'overview' && <OverviewTab />}

            {/* Observed Users Tab */}
            {dashboardTab === 'observed' && <ObservedUsersTab />}

            {/* Detailed Logs Tab */}
            {dashboardTab === 'detailed-logs' && <DetailedObservedLogsTab />}

            {/* Analytics Tab */}
            {dashboardTab === 'analytics' && <AnalyticsTab />}

            {/* AI Details Modals - Eliminados de aquí, ahora están en OverviewTab */}
            {/* <AIDetailsModal open={!!aiDetailsUser} onClose={() => setAIDetailsUser(null)} details={aiDetailsUser} />
            <AIDetailsModal open={!!aiDetailsLog} onClose={() => setAIDetailsLog(null)} details={aiDetailsLog} />
            <AIDetailsModal open={!!aiRecDetails} onClose={() => setAIRecDetails(null)} details={aiRecDetails} /> */}
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
