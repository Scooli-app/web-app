import type { RootState } from "../store";

export const selectSubscription = (state: RootState) => state.subscription?.subscription;
export const selectUsageStats = (state: RootState) => state.subscription?.usage;
export const selectUsageRemaining = (state: RootState) => state.subscription?.usage?.remaining;
export const selectSubscriptionLoading = (state: RootState) => state.subscription?.loading;
export const selectSubscriptionError = (state: RootState) => state.subscription?.error;
