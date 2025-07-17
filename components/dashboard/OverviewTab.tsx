'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Users, Shield, Zap, TrendingUp } from 'lucide-react'; // Iconos
import RiskScoreCard from './cards/RiskScoreCard';
import KpiCard from './cards/KpiCard';
import SuspiciousUserList from './lists/SuspiciousUserList';
import AIRecommendationList from './lists/AIRecommendationList';
import AIDetailsModal from './modals/AIDetailsModal'; // Importar el modal
import { AIRecommendation, AIRecommendationRequest, KpiData, RiskScore, SuspiciousUserForDisplay } from '@/lib/api/types';
import { RiskStatus } from '@/app/enums';
import { OverviewService } from '@/lib/api/services';

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
  const [riskScore, setRiskScore] = useState<RiskScore>({ score: 0, status: RiskStatus.LOW });
  // ¡CAMBIO CLAVE! Usar el nuevo tipo para el estado
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUserForDisplay[]>([]);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);

  const [aiDetailsUser, setAIDetailsUser] = useState<any>(null);
  const [aiRecDetails, setAIRecDetails] = useState<any>(null);

  // Función para obtener y procesar todos los datos del dashboard
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await OverviewService.getOverview();
      setRiskScore(result.finalRiskScore);

      const finalKpiData = {
        totalUsers: result.totalUsers,
        activeZones: result.activeZonesCount || 0,
        accessesToday: result.accessesToday,
        activeAlerts: result.activeAlerts,
        anomalousAttempts: result.anomalousAttempts,
        successRate: parseFloat(result.successRate.toFixed(1)),
      };
      setKpiData(finalKpiData);

      // ¡CAMBIO CLAVE! Mapear a SuspiciousUserForDisplay antes de setear el estado
      const finalSuspiciousUsers: SuspiciousUserForDisplay[] = Object.values(result.suspiciousUsersMap).map(({ count, ...rest }) => rest);
      setSuspiciousUsers(finalSuspiciousUsers);

      setLoadingAI(true);
      try {
        const request: AIRecommendationRequest = {
          riskScore: result.finalRiskScore,
          kpiData: finalKpiData,
          suspiciousUsers: finalSuspiciousUsers.map((u) => ({
            id: u.id,
            name: u.name,
            reason: u.reason,
            photoUrl: u.photoUrl,
          })),
        };
        const aiRecommendationsData = await OverviewService.getAIRecommendations(request);
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
  }, []);

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
