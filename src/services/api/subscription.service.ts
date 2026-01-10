/**
 * Subscription Service
 * Handles all subscription and billing API calls
 */

import apiClient from "./client";
import type {
  SubscriptionPlan,
  CurrentSubscription,
  UsageStats,
  CheckoutRequest,
  CheckoutResponse,
  PortalResponse,
} from "@/shared/types/subscription";

const SUBSCRIPTIONS_BASE = "/subscriptions";

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await apiClient.get<SubscriptionPlan[]>(
    `${SUBSCRIPTIONS_BASE}/plans`
  );
  return response.data;
}

export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  const response = await apiClient.get<CurrentSubscription | null>(
    `${SUBSCRIPTIONS_BASE}/current`
  );
  return response.data;
}

export async function getUsageStats(): Promise<UsageStats> {
  const response = await apiClient.get<UsageStats>(
    `${SUBSCRIPTIONS_BASE}/usage`
  );
  return response.data;
}

export async function createCheckoutSession(
  request: CheckoutRequest
): Promise<CheckoutResponse> {
  const response = await apiClient.post<CheckoutResponse>(
    `${SUBSCRIPTIONS_BASE}/checkout`,
    request
  );
  return response.data;
}

export async function createPortalSession(): Promise<PortalResponse> {
  const response = await apiClient.post<PortalResponse>(
    `${SUBSCRIPTIONS_BASE}/portal`
  );
  return response.data;
}

export async function cancelSubscription(): Promise<void> {
  await apiClient.post(`${SUBSCRIPTIONS_BASE}/cancel`);
}
