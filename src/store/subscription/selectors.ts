import type { RootState } from "../store";

export const selectSubscription = (state: RootState) => state.subscription?.subscription;
export const selectUsageStats = (state: RootState) => state.subscription?.usage;

export const selectSubscriptionLoading = (state: RootState) => state.subscription?.loading;


/**
 * Effective Pro access is resolved by the entitlements API.
 * Personal subscription data remains billing-focused.
 */
export const selectIsPro = (state: RootState) =>
  state.entitlements?.entitlement?.isPro ?? false;
