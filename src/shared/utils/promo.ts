import type { SubscriptionPlan } from "@/shared/types/subscription";

const PROMO_ENDS_AT = process.env.NEXT_PUBLIC_PROMO_ENDS_AT;

export function isPromoActive(): boolean {
  if (!PROMO_ENDS_AT) {
    return false;
  }
  const endsAt = new Date(PROMO_ENDS_AT);
  return !Number.isNaN(endsAt.getTime()) && new Date() < endsAt;
}

export const PROMO_PLAN_CODES = {
  monthly: "pro_monthly_promo_rega2026",
  annual: "pro_annual_promo_rega2026",
} as const;

// Used to tag analytics events with a boolean instead of forcing every
// downstream chart/insight to do a "plan_code contains _promo" filter.
// Also matches the retired August promo codes so historical/grandfathered
// promo subscribers are still tagged correctly.
export function isPromoPlanCode(planCode: string | null | undefined): boolean {
  return (
    planCode === PROMO_PLAN_CODES.monthly ||
    planCode === PROMO_PLAN_CODES.annual ||
    planCode === "pro_monthly_promo" ||
    planCode === "pro_annual_promo"
  );
}

// Mirrors the real pro_monthly/pro_annual pricing - these plan codes are
// deliberately excluded from GET /subscriptions/plans (unadvertised promo),
// so there's no live source to fetch this display data from.
export const PROMO_PLANS: SubscriptionPlan[] = [
  {
    planCode: PROMO_PLAN_CODES.monthly,
    name: "Scooli Pro Mensal",
    priceCents: 499,
    currency: "EUR",
    interval: "month",
  },
  {
    planCode: PROMO_PLAN_CODES.annual,
    name: "Scooli Pro Anual",
    priceCents: 4790,
    currency: "EUR",
    interval: "year",
  },
];
