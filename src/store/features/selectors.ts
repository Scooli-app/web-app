import { createSelector } from "@reduxjs/toolkit";
import { FeatureFlag } from "@/shared/types/featureFlags";
import type { RootState } from "../store";

const selectFeaturesState = (state: RootState) => state.features;

export const selectFeatureFlags = createSelector(
  [selectFeaturesState],
  (featuresState) => featuresState.flags
);

export const selectEnabledFeatureFlags = createSelector(
  [selectFeatureFlags],
  (flags) =>
    (Object.entries(flags)
      .filter(([, enabled]) => enabled === true)
      .map(([feature]) => feature as FeatureFlag))
);

export const selectFeaturesLoading = createSelector(
  [selectFeaturesState],
  (featuresState) => featuresState.loading
);

export const selectFeaturesError = createSelector(
  [selectFeaturesState],
  (featuresState) => featuresState.error
);

export const selectIsFeatureEnabled =
  (featureFlag: FeatureFlag) => (state: RootState) =>
    selectEnabledFeatureFlags(state).includes(featureFlag);

export const selectIsPresentationCreationEnabled = createSelector(
  [selectEnabledFeatureFlags],
  (enabledFeatures) => enabledFeatures.includes(FeatureFlag.PRESENTATION_CREATION)
);

export const selectIsCommunityLibraryEnabled = createSelector(
  [selectEnabledFeatureFlags],
  (enabledFeatures) => enabledFeatures.includes(FeatureFlag.COMMUNITY_LIBRARY)
);

export const selectIsDocumentReviewEnabled = createSelector(
  [selectEnabledFeatureFlags],
  (enabledFeatures) => enabledFeatures.includes(FeatureFlag.DOCUMENT_REVIEW)
);
