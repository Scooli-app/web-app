import apiClient from "./client";

export interface ModelCostDto {
  model: string;
  costUsd: number;
  interactions: number;
}

export interface AdminCostSummary {
  totalCostUsd: number;
  totalUsers: number;
  usersWithCost: number;
  averagePerUserUsd: number;
  medianPerUserUsd: number;
  textCostUsd: number;
  imageCostUsd: number;
  eventsWithCost: number;
  eventsWithoutCost: number;
  costByEventType: Record<string, number>;
  costByModel: Record<string, number>;
  costByTool: Record<string, number>;
  periodStart: string;
  periodEnd: string;
  pricingVersion: string;
}

export interface AdminUserCost {
  userId: string;
  clerkUserId?: string | null;
  email?: string | null;
  name?: string | null;
  totalCostUsd: number;
  textCostUsd: number;
  imageCostUsd: number;
  interactions: number;
  tokensInput: number;
  tokensOutput: number;
  imageCount: number;
  breakdownByEventType: Record<string, number>;
  breakdownByTool: Record<string, number>;
  topModels: ModelCostDto[];
  lastActivityAt?: string | null;
}

export interface AdminCostInsightsResponse {
  summary: AdminCostSummary;
  users: AdminUserCost[];
}

export interface CostInsightsFilters {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const adminCostInsightsService = {
  async getInsights(filters: CostInsightsFilters = {}): Promise<AdminCostInsightsResponse> {
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.limit !== undefined) params.set("limit", String(filters.limit));
    if (filters.offset !== undefined) params.set("offset", String(filters.offset));

    const response = await apiClient.get<AdminCostInsightsResponse>(
      `/admin/cost-insights?${params.toString()}`
    );
    return response.data;
  },

  async invalidatePricingCache(): Promise<void> {
    await apiClient.post("/admin/cost-insights/pricing/invalidate-cache");
  },
};
