"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { selectFeaturesLoaded } from "@/store/features/selectors";

/**
 * Reads a feature-flag selector together with whether GET /features has resolved.
 *
 * Route guards must NOT redirect on `!enabled` until `loaded` is true — on a hard
 * navigation / refresh the flags slice starts empty and every gated selector is
 * momentarily false, which used to bounce entitled users to the dashboard.
 */
export function useFeatureAccess(
  flagSelector: (state: RootState) => boolean,
): { loaded: boolean; enabled: boolean } {
  const loaded = useSelector(selectFeaturesLoaded);
  const enabled = useSelector(flagSelector);
  return { loaded, enabled };
}
