/** Error codes returned by the API (HTTP 403) when a free-plan limit blocks an action. */
export type FreePlanLimitCode = "free_class_limit" | "free_period_limit";

/** Why the upgrade modal opened: a free-plan limit, or a Pro-only document type (presentations). */
export type UpgradeReason = FreePlanLimitCode | "presentation_pro";

export function isUpgradeReason(code: string): code is FreePlanLimitCode {
  return code === "free_class_limit" || code === "free_period_limit";
}

export interface PlanLimits {
  isPro: boolean;
  maxActiveClasses: number | null;
  activeClasses: number;
  windowStart: string | null;
  windowEnd: string | null;
  freeWeekStart: string | null;
}
