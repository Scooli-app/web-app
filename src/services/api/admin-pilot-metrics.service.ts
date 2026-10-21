import type { PilotMetricsReport } from "@/shared/types/pilot-metrics";
import apiClient from "./client";

export interface PilotMetricsFilters {
  /** First day of the range, YYYY-MM-DD. */
  from: string;
  /** Last day of the range, YYYY-MM-DD. */
  to: string;
}

export const adminPilotMetricsService = {
  async getPilotMetrics(filters: PilotMetricsFilters): Promise<PilotMetricsReport> {
    const params = new URLSearchParams({ from: filters.from, to: filters.to });
    const response = await apiClient.get<PilotMetricsReport>(`/admin/pilot-metrics?${params.toString()}`);
    return response.data;
  },
};
