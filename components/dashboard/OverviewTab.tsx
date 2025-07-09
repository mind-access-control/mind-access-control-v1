'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertTriangle, Users, Shield, Zap, TrendingUp } from 'lucide-react'; // Iconos
import RiskScoreCard from './cards/RiskScoreCard';
import KpiCard from './cards/KpiCard';
import SuspiciousUserList from './lists/SuspiciousUserList';
import AIRecommendationList from './lists/AIRecommendationList';
import AIDetailsModal from './modals/AIDetailsModal'; // Importar el modal

// Supabase Client Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// Tipos para los datos de logs relevantes
type LogData = {
  timestamp: string;
  decision: 'access_granted' | 'access_denied' | 'error' | 'unknown';
  reason: string | null;
  user_id: string | null; // ID de usuario registrado
  observed_user_id: string | null; // ID de usuario observado
  user_type: 'registered' | 'observed' | 'new_observed' | 'unknown' | null;
};

// Tipo para los datos de KPI
interface KpiData {
  totalUsers: number;
  activeZones: number;
  accessesToday: number;
  activeAlerts: number;
  anomalousAttempts: number;
  successRate: number;
}

// Tipo para el Risk Score
interface RiskScore {
  score: number;
  status: 'low' | 'moderate' | 'high';
}

// Tipo para las entradas del mapa de usuarios sospechosos (uso interno, incluye 'count')
interface SuspiciousUserMapEntry {
  id: string; // Puede ser user_id o observed_user_id
  name: string; // Nombre completo o ID si no se encuentra
  reason: string;
  details?: any;
  count: number; // Propiedad 'count' es requerida aquí para la lógica de agrupación
  photoUrl?: string | null; // URL de la foto de perfil
}

// ¡CAMBIO CLAVE! Nuevo tipo para los usuarios sospechosos que se mostrarán (NO incluye 'count')
interface SuspiciousUserForDisplay {
  id: string;
  name: string;
  reason: string;
  details?: any;
  photoUrl?: string | null;
}

// Tipo para las recomendaciones de IA
interface AIRecommendation {
  id: string;
  action: string;
  details: string;
}

const OverviewTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const [kpiData, setKpiData] = useState<KpiData>({
    totalUsers: 0,
    activeZones: 0,
    accessesToday: 0,
    activeAlerts: 0,
    anomalousAttempts: 0,
    successRate: 0,
  });
  const [riskScore, setRiskScore] = useState<RiskScore>({ score: 0, status: 'low' });
  // ¡CAMBIO CLAVE! Usar el nuevo tipo para el estado
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUserForDisplay[]>([]);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);

  const [aiDetailsUser, setAIDetailsUser] = useState<any>(null);
  const [aiRecDetails, setAIRecDetails] = useState<any>(null);

  // Función para obtener y procesar todos los datos del dashboard
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const today = new Date();
    const todayStartUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
    const todayEndUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

    try {
      // 1. Total Users
      const { count: registeredUsersCount, error: usersError } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (usersError) throw usersError;

      const { data: observedLogsForUsers, error: observedLogsError } = await supabase
        .from('logs')
        .select('observed_user_id, user_type')
        .not('observed_user_id', 'is', null)
        .eq('user_type', 'new_observed');

      if (observedLogsError) throw observedLogsError;
      const uniqueObservedUsers = new Set(observedLogsForUsers.map((log) => log.observed_user_id));
      const totalUsers = (registeredUsersCount || 0) + uniqueObservedUsers.size;

      // 2. Active Zones
      const { count: activeZonesCount, error: zonesError } = await supabase.from('zones').select('*', { count: 'exact', head: true });
      if (zonesError) throw zonesError;

      // 3. Accesses Today, Active Alerts, Anomalous Attempts, Success Rate
      const { data: todayLogs, error: todayLogsError } = await supabase
        .from('logs')
        .select(`timestamp, decision, reason, user_id, observed_user_id, user_type`)
        .gte('timestamp', todayStartUTC.toISOString())
        .lte('timestamp', todayEndUTC.toISOString());
      if (todayLogsError) throw todayLogsError;

      const accessesToday = todayLogs?.length || 0;
      let successfulAccesses = 0;
      let failedAccesses = 0;
      let activeAlerts = 0;
      let anomalousAttempts = 0;
      const suspiciousUsersMap: { [key: string]: SuspiciousUserMapEntry } = {};

      const allRegisteredUserIds = new Set<string>();
      const allObservedUserIds = new Set<string>();
      todayLogs?.forEach((log) => {
        if (log.user_type === 'registered' && log.user_id) allRegisteredUserIds.add(log.user_id);
        if ((log.user_type === 'observed' || log.user_type === 'new_observed') && log.observed_user_id) allObservedUserIds.add(log.observed_user_id);
      });

      // Obtener detalles de usuarios registrados
      const { data: registeredUsersData, error: fetchRegisteredUsersError } = await supabase.from('users').select('id, full_name, profile_picture_url');
      if (fetchRegisteredUsersError) console.error('Error fetching registered user details:', fetchRegisteredUsersError);
      const registeredUserDetailsMap = new Map(registeredUsersData?.map((user) => [user.id, { name: user.full_name, photo: user.profile_picture_url }]) || []);

      // Obtener detalles de usuarios observados
      const { data: observedUsersData, error: fetchObservedUsersError } = await supabase.from('observed_users').select('id, face_image_url');
      if (fetchObservedUsersError) console.error('Error fetching observed user details:', fetchObservedUsersError);
      const observedUserDetailsMap = new Map(
        observedUsersData?.map((user) => [user.id, { name: `Observed User ${user.id.substring(0, 8)}`, photo: user.face_image_url }]) || []
      );

      todayLogs?.forEach((log) => {
        if (log.decision === 'access_granted') {
          successfulAccesses++;
        } else if (log.decision === 'access_denied' || log.decision === 'error') {
          failedAccesses++;

          if (log.reason?.includes('Alert triggered: true')) {
            activeAlerts++;
          }

          const consecutiveAttemptsMatch = log.reason?.match(/Consecutive denied attempts: (\d+)/);
          if (consecutiveAttemptsMatch && parseInt(consecutiveAttemptsMatch[1]) >= 3) {
            anomalousAttempts++;

            let currentUserId: string; // Ahora no es null
            let currentUserName: string;
            let currentUserPhotoUrl: string | null = null;

            // Determinar si es usuario registrado u observado
            if (log.user_type === 'registered' && log.user_id) {
              currentUserId = log.user_id;
              const userDetails = registeredUserDetailsMap.get(currentUserId);
              currentUserName = userDetails?.name || currentUserId;
              currentUserPhotoUrl = userDetails?.photo || null;
            } else if ((log.user_type === 'observed' || log.user_type === 'new_observed') && log.observed_user_id) {
              currentUserId = log.observed_user_id;
              const userDetails = observedUserDetailsMap.get(currentUserId);
              currentUserName = userDetails?.name || `Observed User ${currentUserId.substring(0, 8)}`;
              currentUserPhotoUrl = userDetails?.photo || null;
            } else {
              // Si user_type es 'unknown' o IDs son null, generar un ID temporal
              currentUserId = `unknown_user_${Date.now()}`;
              currentUserName = `Unknown User ${currentUserId.substring(0, 8)}`;
            }

            // currentUserId ya es string aquí, no necesita comprobación de null
            if (!suspiciousUsersMap[currentUserId] || suspiciousUsersMap[currentUserId].count < parseInt(consecutiveAttemptsMatch[1])) {
              suspiciousUsersMap[currentUserId] = {
                id: currentUserId,
                name: currentUserName,
                reason: `Multiple denied attempts (${consecutiveAttemptsMatch[1]})`,
                details: log,
                count: parseInt(consecutiveAttemptsMatch[1]),
                photoUrl: currentUserPhotoUrl,
              };
            }
          }
        }
      });

      const successRate = accessesToday > 0 ? (successfulAccesses / accessesToday) * 100 : 0;

      // 4. Overall Risk Score (Heurística simple)
      const riskScoreValue = failedAccesses * 0.7 + activeAlerts * 0.3;
      let riskStatus: 'low' | 'moderate' | 'high' = 'low';
      if (riskScoreValue > 10) riskStatus = 'high';
      else if (riskScoreValue > 3) riskStatus = 'moderate';
      const finalRiskScore = { score: parseFloat(riskScoreValue.toFixed(1)), status: riskStatus };
      setRiskScore(finalRiskScore);

      const finalKpiData = {
        totalUsers: totalUsers,
        activeZones: activeZonesCount || 0,
        accessesToday: accessesToday,
        activeAlerts: activeAlerts,
        anomalousAttempts: anomalousAttempts,
        successRate: parseFloat(successRate.toFixed(1)),
      };
      setKpiData(finalKpiData);

      // ¡CAMBIO CLAVE! Mapear a SuspiciousUserForDisplay antes de setear el estado
      const finalSuspiciousUsers: SuspiciousUserForDisplay[] = Object.values(suspiciousUsersMap).map(({ count, ...rest }) => rest);
      setSuspiciousUsers(finalSuspiciousUsers);

      setLoadingAI(true);
      try {
        const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/generate-dashboard-recommendations`;

        const payload = {
          riskScore: finalRiskScore,
          kpiData: finalKpiData,
          suspiciousUsers: finalSuspiciousUsers.map((u) => ({
            id: u.id,
            name: u.name,
            reason: u.reason,
            photoUrl: u.photoUrl,
          })),
        };

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Edge Function error: ${errorData.error || response.statusText}`);
        }

        const aiRecommendationsData: AIRecommendation[] = await response.json();
        setAIRecommendations(aiRecommendationsData);
        console.log('DEBUG: AI Recommendations from Edge Function:', aiRecommendationsData);
      } catch (aiError: any) {
        console.error('Error fetching AI recommendations from Edge Function:', aiError);
        setAIRecommendations([
          { id: 'fallback1', action: 'AI Recommendations Unavailable', details: `Error: ${aiError.message || 'Failed to load AI suggestions.'}` },
        ]);
      } finally {
        setLoadingAI(false);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data.');
      setLoadingAI(false);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Facial Access Control Dashboard - Security Overview</h2>
        <p className="text-indigo-200">AI-powered insights for proactive security management</p>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Loading dashboard data...</div>}
      {error && <div className="text-center py-8 text-red-500">Error: {error}</div>}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="col-span-1">
              <RiskScoreCard
                score={riskScore.score}
                status={riskScore.status}
                tooltipText="Calculated as (Today's Failed Accesses * 0.7) + (Today's Active Alerts * 0.3). A score >10 is High, >3 is Moderate."
              />
            </div>
            <KpiCard
              icon={<Users className="w-8 h-8" />}
              label="Total Users"
              value={kpiData.totalUsers}
              tooltipText="Sum of registered users in the 'users' table and observed users marked as 'new_observed' in the logs."
            />
            <KpiCard
              icon={<Shield className="w-8 h-8" />}
              label="Active Zones"
              value={kpiData.activeZones}
              tooltipText="Total number of zones registered in the 'zones' table."
            />
            <KpiCard
              icon={<Zap className="w-8 h-8" />}
              label="Accesses Today"
              value={kpiData.accessesToday}
              tooltipText="Total number of access attempts (granted, denied, errors, unknown) recorded in the logs for the current day (UTC)."
            />
            <KpiCard
              icon={<AlertTriangle className="w-8 h-8" />}
              label="Active Alerts"
              value={kpiData.activeAlerts}
              alert={kpiData.activeAlerts > 0}
              highlight={kpiData.activeAlerts > 0}
              tooltipText="Number of logs for the current day where the reason includes 'Alert triggered: true'."
            />
            <KpiCard
              icon={<AlertTriangle className="w-8 h-8 text-yellow-500" />}
              label="Anomalous Attempts (AI)"
              value={kpiData.anomalousAttempts}
              highlight={kpiData.anomalousAttempts > 0}
              tooltipText="Number of logs for the current day with consecutive denied access attempts (currently 3 or more), indicating anomalous activity detected by AI."
            />
            <KpiCard
              icon={<TrendingUp className="w-8 h-8" />}
              label="Success Rate"
              value={`${kpiData.successRate}%`}
              tooltipText="Percentage of successful accesses out of total accesses for the current day. Calculated as (Successful Accesses / Total Accesses) * 100."
            />
          </div>
          {/* Anomalous Events & AI Suggestions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SuspiciousUserList users={suspiciousUsers} onDetails={setAIDetailsUser} />
            <AIRecommendationList recommendations={aiRecommendations} onAction={setAIRecDetails} />
          </div>
          {loadingAI && <div className="text-center py-4 text-gray-500">Generating AI recommendations...</div>}
        </>
      )}

      {/* AI Details Modals (se mantienen aquí porque son usados por SuspiciousUserList y AIRecommendationList) */}
      <AIDetailsModal open={!!aiDetailsUser} onClose={() => setAIDetailsUser(null)} details={aiDetailsUser} />
      <AIDetailsModal open={!!aiRecDetails} onClose={() => setAIRecDetails(null)} details={aiRecDetails} />
    </div>
  );
};

export default OverviewTab;
