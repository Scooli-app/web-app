/**
 * Community Library Service
 * Functions for Community Library API calls
 * Provides resource discovery, sharing, reuse, and analytics
 */

import apiClient from "./client";

export type LibraryScope = "community" | "organization";

// ============================================================================
// TYPES
// ============================================================================

export interface SharedResource {
  id: string;
  userId: string;
  organizationId?: string | null;
  organizationName?: string | null;
  contributorName: string;
  title: string;
  description: string | null;
  content: string;
  grade: string;
  subject: string;
  resourceType: string;
  libraryScope: LibraryScope;
  reuseCount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  moderationNotes: string | null;
  isFoundingContributor: boolean;
  createdAt: string;
  approvedAt: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface ShareResourceRequest {
  title: string;
  description?: string;
  content: string;
  grade: string;
  subject: string;
  resourceType: string;
  libraryScope?: LibraryScope;
  documentId?: string;
}

export interface ContributorStats {
  totalResourcesShared: number;
  totalReuses: number;
  approvedResources: number;
  pendingResources: number;
  topResources: ResourceStats[];
}

export interface ResourceStats {
  resourceId: string;
  title: string;
  reuseCount: number;
  status: string;
}

export interface DiscoverResourcesParams {
  scope?: LibraryScope;
  grade?: string;
  subject?: string;
  resourceType?: string;
  search?: string;
  sortBy?: "popular" | "recent";
  page?: number;
  size?: number;
}

// ============================================================================
// RESOURCE DISCOVERY
// ============================================================================

/**
 * Discover approved resources with curriculum filtering.
 * Supports grade, subject, resource type filters and text search.
 */
export async function discoverResources(
  params: DiscoverResourcesParams = {}
): Promise<PaginatedResponse<SharedResource>> {
  const {
    grade,
    subject,
    resourceType,
    scope = "community",
    search,
    sortBy = "popular",
    page = 0,
    size = 20,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("scope", scope);
  if (grade) queryParams.set("grade", grade);
  if (subject) queryParams.set("subject", subject);
  if (resourceType) queryParams.set("resourceType", resourceType);
  if (search) queryParams.set("search", search);
  queryParams.set("sortBy", sortBy);
  queryParams.set("page", String(page));
  queryParams.set("size", String(size));

  const response = await apiClient.get<PaginatedResponse<SharedResource>>(
    `/community/resources?${queryParams.toString()}`
  );
  return response.data;
}

/**
 * Get a single resource by ID (for preview/details).
 */
export async function getResource(resourceId: string): Promise<SharedResource> {
  const response = await apiClient.get<SharedResource>(
    `/community/resources/${resourceId}`
  );
  return response.data;
}

// ============================================================================
// RESOURCE SHARING
// ============================================================================

/**
 * Submit a new resource for community sharing.
 * Resource goes to PENDING status for moderation.
 */
export async function shareResource(
  request: ShareResourceRequest
): Promise<SharedResource> {
  const response = await apiClient.post<SharedResource>(
    "/community/resources",
    request
  );
  return response.data;
}

/**
 * Get user's own shared resources (for personal dashboard).
 */
export async function getMyResources(
  scope: LibraryScope = "community"
): Promise<SharedResource[]> {
  const response = await apiClient.get<SharedResource[]>(
    `/community/resources/mine?scope=${scope}`
  );
  return response.data;
}

// ============================================================================
// RESOURCE REUSE
// ============================================================================

/**
 * Reuse a shared resource.
 * Increments reuse counter and logs attribution for contributor recognition.
 * Returns the resource content for loading into the editor.
 */
export async function reuseResource(
  resourceId: string,
  adaptationNotes?: string
): Promise<SharedResource> {
  const queryParams = adaptationNotes
    ? `?notes=${encodeURIComponent(adaptationNotes)}`
    : "";
  const response = await apiClient.post<SharedResource>(
    `/community/resources/${resourceId}/reuse${queryParams}`
  );
  return response.data;
}

/**
 * Get a list of IDs for all resources the user has already reused.
 * Used to disable the reuse button.
 */
export async function getReusedResourceIds(): Promise<string[]> {
  const response = await apiClient.get<string[]>(
    "/community/resources/reused-ids"
  );
  return response.data;
}

// ============================================================================
// CONTRIBUTOR ANALYTICS
// ============================================================================

/**
 * Get contributor statistics for personal impact dashboard.
 * Shows Ricardo's recognition: total reuses, top resources, etc.
 */
export async function getContributorStats(): Promise<ContributorStats> {
  const response = await apiClient.get<ContributorStats>(
    "/community/analytics/dashboard"
  );
  return response.data;
}

/**
 * Get total library stats (total approved resources count).
 * Independent of any filters, used for stats display.
 */
interface LibraryStats {
  totalApprovedResources: number;
}

export async function getLibraryStats(
  scope: LibraryScope = "community"
): Promise<LibraryStats> {
  const response = await apiClient.get<LibraryStats>(
    `/community/stats?scope=${scope}`
  );
  return response.data;
}

// ============================================================================
// CURRICULUM METADATA (for filters)
// ============================================================================

import { GRADE_GROUPS, SUBJECTS } from "@/components/document-creation/constants";

/**
 * Available grade levels for filtering.
 * Mapped from the single source of truth in document-creation constants.
 */
export const GRADE_OPTIONS = GRADE_GROUPS.flatMap(group => 
  group.grades.map(grade => ({ value: grade.id, label: grade.label }))
);

/**
 * Available subjects for filtering.
 * Mapped from the single source of truth in document-creation constants.
 * When multiple Portuguese labels map to the same backend value, we merge
 * them so filters and cards stay understandable to the user.
 */
export const SUBJECT_OPTIONS = Array.from(
  SUBJECTS.reduce((acc, subject) => {
    const existing = acc.get(subject.value);
    if (!existing) {
      acc.set(subject.value, { value: subject.value, label: subject.label });
      return acc;
    }

    const labels = new Set(existing.label.split(" / "));
    labels.add(subject.label);
    acc.set(subject.value, {
      value: subject.value,
      label: Array.from(labels).join(" / "),
    });
    return acc;
  }, new Map<string, { value: string; label: string }>())
    .values()
);

/**
 * Available resource types for filtering.
 */
export const RESOURCE_TYPE_OPTIONS = [
  { value: "lessonPlan", label: "Plano de Aula" },
  { value: "worksheet", label: "Ficha de Trabalho" },
  { value: "test", label: "Teste" },
  { value: "quiz", label: "Quiz" },
  // { value: "presentation", label: "Apresentação" },
  // { value: "activity", label: "Atividade" },
];
