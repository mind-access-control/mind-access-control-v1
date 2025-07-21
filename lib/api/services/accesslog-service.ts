import { AccessLogFilter, DisplayLog, ObservedLogFilter, ObservedLogResponse } from '@/lib/api/types';
import { extractArrayData, extractObjectData } from '@/lib/api/utils';
import { AccessLogClient } from '../clients/accesslog-client';

const accessLogClient = new AccessLogClient();

export class AccessLogService {
  /**
   * Get the access logs using the optimized edge function
   * @param filter - The filter object containing the filter criteria
   * @returns The access logs
   */
  static async getAccessLogs(filter: AccessLogFilter): Promise<DisplayLog[]> {
    const response = await accessLogClient.getAccessLogs(filter);
    if (!response.success) throw new Error(response.error || 'Failed to fetch access logs');
    return extractArrayData<DisplayLog>(response, 'logs');
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
