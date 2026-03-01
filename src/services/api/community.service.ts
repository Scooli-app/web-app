/**
 * Community Library Service
 * Functions for Community Library API calls
 * Provides resource discovery, sharing, reuse, and analytics
 */

import apiClient from "./client";

// ============================================================================
// TYPES
// ============================================================================

export interface SharedResource {
  id: string;
  userId: string;
  contributorName: string;
  title: string;
  description: string | null;
  content: string;
  grade: string;
  subject: string;
  resourceType: string;
  reuseCount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
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
  grade?: string;
  subject?: string;
  resourceType?: string;
  search?: string;
  sortBy?: "popular" | "recent";
  page?: number;
  size?: number;
}

export interface ModerationActionRequest {
  resourceId: string;
  action: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
  feedback?: string;
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
    search,
    sortBy = "popular",
    page = 0,
    size = 20,
  } = params;

  const queryParams = new URLSearchParams();
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
export async function getMyResources(): Promise<SharedResource[]> {
  const response = await apiClient.get<SharedResource[]>(
    "/community/resources/mine"
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

// ============================================================================
// ADMIN MODERATION
// ============================================================================

/**
 * Get pending resources for moderation queue.
 * Admin only endpoint.
 */
export async function getModerationQueue(
  page = 0,
  size = 20
): Promise<PaginatedResponse<SharedResource>> {
  const response = await apiClient.get<PaginatedResponse<SharedResource>>(
    `/admin/moderation/queue?page=${page}&size=${size}`
  );
  return response.data;
}

/**
 * Process moderation action (approve/reject/request changes).
 * Admin only endpoint.
 */
export async function processModerationAction(
  request: ModerationActionRequest
): Promise<SharedResource> {
  const response = await apiClient.post<SharedResource>(
    "/admin/moderation/action",
    request
  );
  return response.data;
}

// ============================================================================
// CURRICULUM METADATA (for filters)
// ============================================================================

/**
 * Available grade levels for filtering.
 */
export const GRADE_OPTIONS = [
  { value: "1º ano", label: "1º Ano" },
  { value: "2º ano", label: "2º Ano" },
  { value: "3º ano", label: "3º Ano" },
  { value: "4º ano", label: "4º Ano" },
  { value: "5º ano", label: "5º Ano" },
  { value: "6º ano", label: "6º Ano" },
  { value: "7º ano", label: "7º Ano" },
  { value: "8º ano", label: "8º Ano" },
  { value: "9º ano", label: "9º Ano" },
  { value: "10º ano", label: "10º Ano" },
  { value: "11º ano", label: "11º Ano" },
  { value: "12º ano", label: "12º Ano" },
];

/**
 * Available subjects for filtering.
 */
export const SUBJECT_OPTIONS = [
  { value: "Português", label: "Português" },
  { value: "Matemática", label: "Matemática" },
  { value: "Ciências Naturais", label: "Ciências Naturais" },
  { value: "Físico-Química", label: "Físico-Química" },
  { value: "História", label: "História" },
  { value: "Geografia", label: "Geografia" },
  { value: "Inglês", label: "Inglês" },
  { value: "Educação Visual", label: "Educação Visual" },
  { value: "Educação Física", label: "Educação Física" },
  { value: "TIC", label: "TIC" },
  { value: "Cidadania", label: "Cidadania" },
  { value: "Filosofia", label: "Filosofia" },
  { value: "Biologia", label: "Biologia" },
  { value: "Geologia", label: "Geologia" },
];

/**
 * Available resource types for filtering.
 */
export const RESOURCE_TYPE_OPTIONS = [
  { value: "lessonPlan", label: "Plano de Aula" },
  { value: "worksheet", label: "Ficha de Trabalho" },
  { value: "test", label: "Teste" },
  { value: "quiz", label: "Quiz" },
  { value: "presentation", label: "Apresentação" },
  { value: "activity", label: "Atividade" },
];
