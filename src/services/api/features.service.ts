/**
 * Features Service
 * Fetches evaluated feature flags for the current user from the backend.
 */

import apiClient from "./client";

/**
 * The shape of the response from GET /features.
 * Key is the feature flag key, value is whether it is enabled for this user.
 */
export type FeatureFlagsResponse = Record<string, boolean>;

/**
 * Fetch all evaluated feature flags for the currently authenticated user.
 * Backend is the source of truth — values account for overrides, rollout, and global state.
 */
export async function getFeatureFlags(): Promise<FeatureFlagsResponse> {
  const response = await apiClient.get<FeatureFlagsResponse>("/features");
  return response.data;
}
