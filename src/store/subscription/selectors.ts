import { selectCurrentEntitlement, selectEntitlementReady } from "@/store/entitlements/selectors";
import { selectWorkspaceContext, selectWorkspaceReady } from "@/store/workspace/selectors";
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

/** Whether the plan and the workspace are known: loaded once (a refetch keeps the last value), or failed. */
export const selectIsAccessKnown = (state: RootState) =>
  (selectCurrentEntitlement(state) !== null || selectEntitlementReady(state)) &&
  (selectWorkspaceContext(state) !== null || selectWorkspaceReady(state));
