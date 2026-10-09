/** Error codes returned by the API (HTTP 403) when a free-plan limit blocks an action. */
export type UpgradeReason = "free_class_limit" | "free_period_limit";

export interface PlanLimits {
  isPro: boolean;
  maxActiveClasses: number | null;
  activeClasses: number;
  windowStart: string | null;
  windowEnd: string | null;
  freeWeekStart: string | null;
}
