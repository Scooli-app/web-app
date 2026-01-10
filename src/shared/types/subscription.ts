/**
 * Subscription and billing types
 */

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
  creditsUsed: number;
  creditsLimit: number;
  documentsGenerated: number;
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
  portalUrl: string;
}

export const PLAN_CODES = {
  FREE: "free",
  PRO_MONTHLY: "pro_monthly",
  PRO_ANNUAL: "pro_annual",
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

export const PLAN_DISPLAY_INFO: Record<
  string,
  { name: string; description: string; badge?: string }
> = {
  pro_monthly: {
    name: "Scooli Pro Mensal",
    description: "Acesso ilimitado a todas as funcionalidades",
    badge: "Mais Popular",
  },
  pro_annual: {
    name: "Scooli Pro Anual",
    description: "20% de desconto no plano anual",
    badge: "Melhor Valor",
  },
  free: {
    name: "Plano Gratuito",
    description: "100 créditos de boas-vindas",
  },
};
