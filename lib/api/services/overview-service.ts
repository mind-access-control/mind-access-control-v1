import { supabase } from '@/lib/supabase';
import { AIRecommendation, AIRecommendationRequest, OverviewResponse, SuspiciousUserMapEntry } from '@/lib/api/types';
import { LogDecision, RiskStatus, UserType } from '@/app/enums';
import { OverviewClient } from '@/lib/api/clients/overview-client';
import { extractArrayData } from '@/lib/api/utils';

const overviewClient = new OverviewClient();

export class OverviewService {
  /**
   * Get the overview of the dashboard
   * @returns The overview of the dashboard
   */
  static async getOverview(): Promise<OverviewResponse> {
    const today = new Date();
    const todayStartUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
    const todayEndUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
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
      if (log.user_type === UserType.REGISTERED && log.user_id) allRegisteredUserIds.add(log.user_id);
      if ((log.user_type === UserType.OBSERVED || log.user_type === UserType.NEW_OBSERVED) && log.observed_user_id)
        allObservedUserIds.add(log.observed_user_id);
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
      if (log.decision === LogDecision.ACCESS_GRANTED) {
        successfulAccesses++;
      } else if (log.decision === LogDecision.ACCESS_DENIED || log.decision === LogDecision.ERROR) {
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
          if (log.user_type === UserType.REGISTERED && log.user_id) {
            currentUserId = log.user_id;
            const userDetails = registeredUserDetailsMap.get(currentUserId);
            currentUserName = userDetails?.name || currentUserId;
            currentUserPhotoUrl = userDetails?.photo || null;
          } else if ((log.user_type === UserType.OBSERVED || log.user_type === UserType.NEW_OBSERVED) && log.observed_user_id) {
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
    let riskStatus = RiskStatus.LOW;
    if (riskScoreValue > 10) riskStatus = RiskStatus.HIGH;
    else if (riskScoreValue > 3) riskStatus = RiskStatus.MODERATE;
    const finalRiskScore = { score: parseFloat(riskScoreValue.toFixed(1)), status: riskStatus };

    return {
      totalUsers,
      activeZonesCount: activeZonesCount || 0,
      accessesToday,
      activeAlerts,
      anomalousAttempts,
      successRate,
      finalRiskScore,
      suspiciousUsersMap,
    };
  }

  /**
   * Get AI recommendations
   * @param request - The request object containing the risk score, kpi data, and suspicious users
   * @returns The AI recommendations
   */
  static async getAIRecommendations(request: AIRecommendationRequest): Promise<AIRecommendation[]> {
    const response = await overviewClient.getAIRecommendations(request);
    if (!response.success) throw new Error(response.error || 'Failed to fetch AI recommendations');
    return extractArrayData<AIRecommendation>(response);
  }
}
