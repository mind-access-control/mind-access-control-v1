import { EDGE_FUNCTIONS } from '@/lib/constants';
import { ApiResponse, ObservedLogFilter, ObservedLogResponse } from '@/lib/api/types';
import { BaseApiClient } from './base-client';

export class AccessLogClient extends BaseApiClient {
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
