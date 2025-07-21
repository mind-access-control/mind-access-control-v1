import { LogDecision } from '@/app/enums';
import { supabase } from '@/lib/supabase';
import { DailyTrendEntry, LogData, AnalyticResponse } from '@/lib/api/types';
import { EMPTY_STRING } from '@/lib/constants';

export class AnalyticService {
  /**
   * Get the analytics
   * @param dateFrom - The start date
   * @param dateTo - The end date
   * @returns The analytics
   */
  static async getAnalytics(dateFrom: string, dateTo: string): Promise<AnalyticResponse> {
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select(`timestamp, decision, reason, match_status`)
      .gte('timestamp', `${dateFrom}T00:00:00.000Z`)
      .lte('timestamp', `${dateTo}T23:59:59.999Z`)
      .order('timestamp', { ascending: true });

    if (logsError) throw logsError;

    console.log('DEBUG: Raw logs fetched:', logs);

    // --- Procesar datos para Security Trends Chart ---
    const dailyDataMap: Record<string, { success: number; failed: number }> = {};
    const datesForChart: DailyTrendEntry[] = [];

    let currentDateIter = new Date(dateFrom + 'T00:00:00.000Z'); // Crear fecha en UTC para iterar
    const endDateIter = new Date(dateTo + 'T00:00:00.000Z');

    while (currentDateIter <= endDateIter) {
      const dateKey = currentDateIter.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
      const dayName = new Date(currentDateIter).toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' });
      dailyDataMap[dateKey] = { success: 0, failed: 0 };
      datesForChart.push({ name: dayName, dateKey: dateKey, success: 0, failed: 0 });
      currentDateIter.setUTCDate(currentDateIter.getUTCDate() + 1); // Avanzar un día en UTC
    }

    logs.forEach((log) => {
      const logDate = new Date(log.timestamp);
      const dateKey = logDate.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)

      if (dailyDataMap[dateKey]) {
        if (log.decision === LogDecision.ACCESS_GRANTED) {
          dailyDataMap[dateKey].success++;
        } else if (log.decision === LogDecision.ACCESS_DENIED || log.decision === LogDecision.ERROR) {
          dailyDataMap[dateKey].failed++;
        }
      }
    });

    const finalTrendData = datesForChart.map((entry) => ({
      name: entry.name,
      dateKey: entry.dateKey,
      success: dailyDataMap[entry.dateKey]?.success || 0,
      failed: dailyDataMap[entry.dateKey]?.failed || 0,
    }));
    // --- Procesar datos para Failure Cause Chart ---
    const failureCauses: { [key: string]: number } = {};
    logs.forEach((log) => {
      if (log.decision === LogDecision.ACCESS_DENIED || log.decision === LogDecision.ERROR) {
        const categorizedReason = AnalyticService.categorizeFailureReason(log);
        failureCauses[categorizedReason] = (failureCauses[categorizedReason] || 0) + 1;
        // console.log(`DEBUG: Failed Log - Timestamp: ${log.timestamp}, Decision: ${log.decision}, Reason: "${log.reason}", Match Status: "${log.match_status}" -> Categorized As: "${categorizedReason}"`); // Descomentar para depuración detallada
      }
    });

    const finalFailureCauseData = Object.entries(failureCauses)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      dailyTrendData: finalTrendData,
      failureCauseData: finalFailureCauseData,
    };
  }

  /**
   * Helper to categorize the failure reason
   * @param log - The log data
   * @returns The categorized reason
   */
  static categorizeFailureReason(log: LogData): string {
    const reason = log.reason?.toLowerCase() || EMPTY_STRING;
    const decision = log.decision;
    const matchStatus = log.match_status?.toLowerCase() || EMPTY_STRING;

    if (decision === LogDecision.ACCESS_GRANTED) return 'Success';

    if (reason.includes('access denied for zone')) {
      return 'Access Denied (Zone)';
    }
    if (reason.includes('access denied for status')) {
      return 'Access Denied (Status/Role)';
    }
    if (reason.includes('face not recognized') || reason.includes('no face detected') || matchStatus.includes('no_match')) {
      return 'Face Recognition Failure';
    }
    if (reason.includes('unknown_match')) {
      return 'Unknown User Match';
    }
    if (reason.includes('system error')) {
      return 'System Error';
    }
    if (decision === LogDecision.ERROR) {
      return 'Processing Error';
    }
    if (decision === LogDecision.UNKNOWN) {
      return 'Unknown Decision';
    }

    if (log.reason) {
      const genericReason = log.reason.split(':')[0].trim();
      if (genericReason.length > 0 && genericReason.length < 50) {
        return genericReason;
      }
    }
    return 'Other Denials';
  }
}
