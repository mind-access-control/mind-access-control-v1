import { EDGE_FUNCTIONS, NA_VALUE, SELECT_ALL_VALUE } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { AccessLogFilter, DisplayLog, Log, ObservedLogFilter, ObservedLogResponse, Role, UserStatus, Zone } from '../types';
import { extractObjectData } from '../utils';
import { AccessLogClient } from '../clients/accesslog-client';

const accessLogClient = new AccessLogClient();

export class AccessLogService {
  /**
   * Get the access logs
   * @param filter - The filter object containing the filter criteria
   * @param roles - The roles array
   * @param userStatuses - The user statuses array
   * @param zonesList - The zones list array
   * @returns The access logs
   */
  static async getAccessLogs(filter: AccessLogFilter, roles: Role[], userStatuses: UserStatus[], zonesList: Zone[]): Promise<DisplayLog[]> {
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Precompute lookup maps for efficiency
      const rolesMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));
      const statusesMap = Object.fromEntries(userStatuses.map((s) => [s.id, s.name]));
      const zonesMap = Object.fromEntries(zonesList.map((z) => [z.id, z.name]));

      let query = supabase
        .from('logs')
        .select(
          `id,timestamp,user_id,observed_user_id,camera_id,result,user_type,match_status,decision,reason,confidence_score,requested_zone_id,users(full_name,role_id,status_id,profile_picture_url),zones(name)`
        )
        .not('user_id', 'is', null)
        .order('timestamp', { ascending: false });

      if (filter.dateFrom) query = query.gte('timestamp', filter.dateFrom);
      if (filter.dateTo) query = query.lte('timestamp', filter.dateTo);

      if (filter.selectedLogDecisionId !== SELECT_ALL_VALUE) {
        //TODO: Check if this is correct
        query = query.ilike('decision', `%${filter.selectedLogDecisionId}%`);
      }

      if (filter.selectedLogUserId !== SELECT_ALL_VALUE) {
        query = query.eq('user_id', filter.selectedLogUserId);
      }

      if (filter.selectedLogZoneId !== SELECT_ALL_VALUE) {
        query = query.eq('requested_zone_id', filter.selectedLogZoneId);
      }

      const { data: rawLogs, error: logsError } = (await query) as {
        data:
          | (Log & {
              users: { full_name: string; role_id: string; status_id: string; profile_picture_url: string | null } | null;
              zones: { name: string } | null;
            })[]
          | null;
        error: any;
      };

      if (logsError) {
        console.error('Supabase Query Error:', logsError);
        throw logsError;
      }

      if (!rawLogs || rawLogs.length === 0) {
        return [];
      }

      const uniqueUserIds = Array.from(new Set(rawLogs.map((log) => log.user_id).filter(Boolean))) as string[];
      let userEmailsMap: Record<string, string> = {};

      if (uniqueUserIds.length > 0) {
        try {
          const edgeFunctionUrl = `${SUPABASE_URL}${EDGE_FUNCTIONS.GET_USER_EMAILS}`;
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

      const lowerCaseSearchTerm = filter.generalSearchTerm.toLowerCase();
      const filterBySearch = (log: DisplayLog) => {
        if (!filter.generalSearchTerm) return true;
        return (
          (log.userName?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
          (log.userEmail?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
          (log.userRole?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
          (log.userStatus?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
          (log.zoneName?.toLowerCase().includes(lowerCaseSearchTerm) ?? false) ||
          (log.status?.toLowerCase().includes(lowerCaseSearchTerm) ?? false)
        );
      };

      const processedLogs: DisplayLog[] = rawLogs.map((log) => {
        const userDetails = log.users;
        const userName = userDetails?.full_name || log.user_id || NA_VALUE;
        const userEmail = log.user_id ? userEmailsMap[log.user_id] || NA_VALUE : NA_VALUE;
        const userRole = userDetails?.role_id ? rolesMap[userDetails.role_id] || NA_VALUE : NA_VALUE;
        const userStatus = userDetails?.status_id ? statusesMap[userDetails.status_id] || NA_VALUE : NA_VALUE;
        const zoneName = log.zones?.name || (log.requested_zone_id ? zonesMap[log.requested_zone_id] || log.requested_zone_id : NA_VALUE);
        const status = log.decision;
        const profilePictureUrl = userDetails?.profile_picture_url || null;
        return {
          id: log.id,
          timestamp: new Date(log.timestamp).toLocaleString(),
          userId: log.user_id,
          userName,
          userEmail,
          userRole,
          userStatus,
          zoneName,
          status,
          profilePictureUrl,
        };
      });

      // Only filter by search term, as zone filtering is handled in the query
      return processedLogs.filter(filterBySearch);
    } catch (error) {
      console.error('Error fetching access logs:', error);
      throw error;
    }
  }

  /**
   * Get the observed logs
   * @param filter - The filter object containing the filter criteria
   * @returns The observed logs
   */
  static async getObservedLogs(filter: ObservedLogFilter): Promise<ObservedLogResponse> {
    const response = await accessLogClient.getObservedLogs(filter);
    if (!response.success) throw new Error(response.error || 'Failed to fetch observed logs');
    return extractObjectData<ObservedLogResponse>(response);
  }
}
