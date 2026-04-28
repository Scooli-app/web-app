import type { RootState } from "@/store/store";

export const selectCurrentEntitlement = (state: RootState) =>
  state.entitlements.entitlement;
export const selectEntitlementUsage = (state: RootState) =>
  state.entitlements.entitlement?.usage ?? null;
export const selectEntitlementLoading = (state: RootState) =>
  state.entitlements.loading;
export const selectEntitlementReady = (state: RootState) =>
  state.entitlements.ready;
export const selectEntitlementError = (state: RootState) =>
  state.entitlements.error;
export const selectEffectiveAccessSource = (state: RootState) =>
  state.entitlements.entitlement?.source ?? "none";
export const selectHasOrganizationBackedPro = (state: RootState) => {
  const source = state.entitlements.entitlement?.source;
  return source === "organization" || source === "both";
};
export const selectHasEffectivePro = (state: RootState) =>
  state.entitlements.entitlement?.isPro ?? false;
