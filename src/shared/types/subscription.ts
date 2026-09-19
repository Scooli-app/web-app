/**
 * Subscription and billing types
 */

import { translate } from "@/i18n/translate";

export interface SubscriptionPlan {
  planCode: string;
  name: string;
  description?: string;
  priceCents: number;
  currency?: string;
  interval: "month" | "year";
  features?: string[];
  popular?: boolean;
}

export interface CurrentSubscription {
  id: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "free";

export interface UsageStats {
  used: number;
  limit: number;
  remaining: number;
  percentageUsed: number;
  periodStart: string;
  periodEnd: string;
}

export interface CheckoutRequest {
  planCode: string;
}

export interface CheckoutResponse {
  url: string;
  sessionId?: string;
}

export interface PortalResponse {
  url: string;
}

/**
 * Maps a plan code to the message key segment under `billing.plans.*` in the
 * catalogues. Kept as plain data (no translated text) so this stays a safe
 * module-level constant — the actual copy is resolved by `getPlanDisplayInfo`
 * at the moment it's needed, never frozen at import time.
 */
const PLAN_MESSAGE_KEYS: Record<string, string> = {
  pro_monthly: "proMonthly",
  pro_annual: "proAnnual",
  free: "free",
};

export interface PlanDisplayInfo {
  name: string;
  description: string;
  badge?: string;
}

/** Resolves the localized name/description/badge for a plan code, or `undefined` for an unknown code. */
export function getPlanDisplayInfo(planCode: string): PlanDisplayInfo | undefined {
  const key = PLAN_MESSAGE_KEYS[planCode];
  if (!key) {
    return undefined;
  }
  return {
    name: translate(`billing.plans.${key}.name`),
    description: translate(`billing.plans.${key}.description`),
    badge: key === "free" ? undefined : translate(`billing.plans.${key}.badge`),
  };
}
