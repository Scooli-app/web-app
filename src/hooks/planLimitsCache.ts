import type { PlanLimits } from "@/shared/types/plan-limits";

/**
 * One plan-limits request per signed-in user. Keyed by user so that signing out and into another
 * account in the same tab (no reload) never shows the previous account's limits.
 * Fails open: a failed read resolves to null (the server still enforces the limits) and is retried.
 */
export function createPlanLimitsCache(fetcher: () => Promise<PlanLimits | null>) {
  let cached: Promise<PlanLimits | null> | null = null;
  let cachedFor: string | null = null;

  return {
    get(userId: string | null | undefined): Promise<PlanLimits | null> {
      const key = userId ?? "";
      if (!cached || cachedFor !== key) {
        cachedFor = key;
        const request = fetcher().catch(() => {
          if (cached === request) cached = null;
          return null;
        });
        cached = request;
      }
      return cached;
    },
    invalidate() {
      cached = null;
    },
  };
}
