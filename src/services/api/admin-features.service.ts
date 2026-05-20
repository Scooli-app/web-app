/**
 * Admin Features Service
 * Manages feature flag overrides (user/organization/role/plan) and admin search.
 *
 * All endpoints require admin role on the backend.
 */

import apiClient from "./client";

// =============================================================================
// TYPES
// =============================================================================

export type OverrideTargetType = "user" | "organization" | "role" | "plan";

export interface FeatureOverrideDto {
  id: string;
  enabled: boolean;
  userId?: string;
  /** Optional: backend may return the user's display name alongside the ID */
  userName?: string;
  /** Optional: backend may return the user's email alongside the ID */
  userEmail?: string;
  organizationId?: string;
  /** Optional: backend may return the org name alongside the ID */
  organizationName?: string;
  role?: string;
  plan?: string;
  createdAt: string;
}

export interface AdminFeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
  overrides?: FeatureOverrideDto[];
}

export interface UserSearchResult {
  id: string;
  email: string;
  name: string | null;
}

export interface OrganizationSearchResult {
  id: string;
  name: string;
  slug: string | null;
}

export interface PlanOption {
  planCode: string;
  name: string;
}

// =============================================================================
// FLAG LISTING / UPDATE
// =============================================================================

export async function listFlags(): Promise<AdminFeatureFlag[]> {
  const res = await apiClient.get<AdminFeatureFlag[]>("/admin/features");
  return res.data;
}

export async function getFlag(key: string): Promise<AdminFeatureFlag> {
  const res = await apiClient.get<AdminFeatureFlag>(`/admin/features/${key}`);
  return res.data;
}

export async function updateFlag(
  key: string,
  patch: { enabled?: boolean; rolloutPercentage?: number },
): Promise<AdminFeatureFlag> {
  const res = await apiClient.patch<AdminFeatureFlag>(`/admin/features/${key}`, patch);
  return res.data;
}

// =============================================================================
// OVERRIDES
// =============================================================================

export async function setUserOverride(
  key: string,
  userId: string,
  enabled: boolean,
): Promise<void> {
  await apiClient.post(`/admin/features/${key}/overrides/users/${userId}`, { enabled });
}

export async function removeUserOverride(key: string, userId: string): Promise<void> {
  await apiClient.delete(`/admin/features/${key}/overrides/users/${userId}`);
}

export async function setOrganizationOverride(
  key: string,
  organizationId: string,
  enabled: boolean,
): Promise<void> {
  await apiClient.post(`/admin/features/${key}/overrides/organizations/${organizationId}`, {
    enabled,
  });
}

export async function removeOrganizationOverride(
  key: string,
  organizationId: string,
): Promise<void> {
  await apiClient.delete(`/admin/features/${key}/overrides/organizations/${organizationId}`);
}

export async function setRoleOverride(
  key: string,
  role: string,
  enabled: boolean,
): Promise<void> {
  await apiClient.post(`/admin/features/${key}/overrides/roles/${role}`, { enabled });
}

export async function removeRoleOverride(key: string, role: string): Promise<void> {
  await apiClient.delete(`/admin/features/${key}/overrides/roles/${role}`);
}

export async function setPlanOverride(
  key: string,
  planCode: string,
  enabled: boolean,
): Promise<void> {
  await apiClient.post(`/admin/features/${key}/overrides/plans/${planCode}`, { enabled });
}

export async function removePlanOverride(key: string, planCode: string): Promise<void> {
  await apiClient.delete(`/admin/features/${key}/overrides/plans/${planCode}`);
}

// =============================================================================
// SEARCH (typeahead)
// =============================================================================

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (query.trim().length < 2) return [];
  const res = await apiClient.get<UserSearchResult[]>("/admin/search/users", {
    params: { q: query },
  });
  return res.data;
}

export async function getUserById(id: string): Promise<UserSearchResult | null> {
  try {
    const res = await apiClient.get<UserSearchResult>(`/admin/search/users/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function searchOrganizations(
  query: string,
): Promise<OrganizationSearchResult[]> {
  if (query.trim().length < 2) return [];
  const res = await apiClient.get<OrganizationSearchResult[]>("/admin/search/organizations", {
    params: { q: query },
  });
  return res.data;
}

export async function getOrganizationById(id: string): Promise<OrganizationSearchResult | null> {
  try {
    const res = await apiClient.get<OrganizationSearchResult>(`/admin/search/organizations/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function listPlans(): Promise<PlanOption[]> {
  const res = await apiClient.get<PlanOption[]>("/admin/search/plans");
  return res.data;
}
