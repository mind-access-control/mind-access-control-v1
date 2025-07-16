import { EDGE_FUNCTIONS } from '@/lib/constants';
import { AIRecommendation, AIRecommendationRequest, ApiResponse } from '../types';
import { AnonKeyApiClient } from './base-client';

export class OverviewClient extends AnonKeyApiClient {
  /**
   * Get AI recommendations for the dashboard
   * @param request - The request object containing the user's input
   * @returns The API response containing the AI recommendations
   */
  async getAIRecommendations(request: AIRecommendationRequest): Promise<ApiResponse<AIRecommendation[]>> {
    return this.makeRequest(EDGE_FUNCTIONS.GENERATE_DASHBOARD_RECOMMENDATIONS, { method: 'POST', body: request });
  }
}
