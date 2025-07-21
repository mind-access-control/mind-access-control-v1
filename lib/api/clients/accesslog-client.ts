import { EDGE_FUNCTIONS } from '@/lib/constants';
import { AccessLogFilter, ApiResponse, DisplayLog, ObservedLogFilter, ObservedLogResponse } from '@/lib/api/types';
import { BaseApiClient } from './base-client';

export class AccessLogClient extends BaseApiClient {
  /**
   * Get the access logs
   * @param filter - The filter object containing the filter criteria
   * @returns The access logs
   */
  async getAccessLogs(filter: AccessLogFilter): Promise<ApiResponse<DisplayLog[]>> {
    return this.makeRequest(EDGE_FUNCTIONS.EF_LOGS, { method: 'POST', body: filter });
  }

  /**
   * Get the observed logs
   * @param filter - The filter object containing the filter criteria
   * @returns The observed logs
   */
  async getObservedLogs(filter: ObservedLogFilter): Promise<ApiResponse<ObservedLogResponse>> {
    const params: Record<string, string> = {};
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = String(value);
      }
    });
    return this.makeRequest(EDGE_FUNCTIONS.GET_OBSERVED_USER_LOGS, { method: 'GET', params });
  }
}
