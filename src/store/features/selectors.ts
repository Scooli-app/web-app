import { createSelector } from "@reduxjs/toolkit";
import { FeatureFlag } from "@/shared/types/featureFlags";
import type { RootState } from "../store";

const selectFeaturesState = (state: RootState) => state.features;

const selectFeatureFlags = createSelector(
  [selectFeaturesState],
  (featuresState) => featuresState.flags
);

const selectEnabledFeatureFlags = createSelector(
  [selectFeatureFlags],
  (flags) =>
    (Object.entries(flags)
      .filter(([, enabled]) => enabled === true)
      .map(([feature]) => feature as FeatureFlag))
);







export const selectIsPresentationCreationEnabled = createSelector(
  [selectEnabledFeatureFlags],
  (enabledFeatures) => enabledFeatures.includes(FeatureFlag.PRESENTATION_CREATION)
);

export const selectIsWorksheetCreationEnabled = createSelector(
  [selectEnabledFeatureFlags],
  (enabledFeatures) => enabledFeatures.includes(FeatureFlag.WORKSHEET_CREATION)
);

export const selectIsTemplateFromDocumentEnabled = createSelector(
  [selectEnabledFeatureFlags],
  (enabledFeatures) => enabledFeatures.includes(FeatureFlag.TEMPLATE_FROM_DOCUMENT)
);





