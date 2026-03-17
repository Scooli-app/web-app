/**
 * Features Service
 * Fetches evaluated feature flags for the current user from the backend.
 */

import type { FeatureFlag } from "@/shared/types/featureFlags";
import { FeatureFlag as FeatureFlagEnum } from "@/shared/types/featureFlags";
import apiClient from "./client";

/**
 * Response shape from GET /features:
 * an array containing only enabled feature keys.
 */
export type FeatureFlagsResponse = FeatureFlag[];

/**
 * Fetch all enabled feature flags for the currently authenticated user.
 * Backend is the source of truth - values account for overrides, rollout, and global state.
 */
export async function getFeatureFlags(): Promise<FeatureFlagsResponse> {
  const response = await apiClient.get<unknown>("/features");
  const data = response.data;
  const knownFlags = new Set(Object.values(FeatureFlagEnum));

  if (!Array.isArray(data)) {
    throw new Error("Invalid feature flags response format");
  }

  const enabledFlags = data.filter(
    (item): item is FeatureFlag =>
      typeof item === "string" && knownFlags.has(item as FeatureFlagEnum)
  );

  return [...new Set(enabledFlags)];
}
