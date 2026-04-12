import type { RootState } from "../store";

export const selectSubscription = (state: RootState) => state.subscription?.subscription;
export const selectUsageStats = (state: RootState) => state.subscription?.usage;

export const selectSubscriptionLoading = (state: RootState) => state.subscription?.loading;


/**
 * Check if the user is a Pro subscriber
 * Pro users have any planCode other than 'free' and an 'active' or 'trialing' status
 */
export const selectIsPro = (state: RootState) => {
  const subscription = state.subscription?.subscription;
  if (!subscription) return false;
  
  return (
    subscription.planCode !== "free" && 
    (subscription.status === "active" || subscription.status === "trialing")
  );
};
