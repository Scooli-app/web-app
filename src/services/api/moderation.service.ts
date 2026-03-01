/**
 * Moderation Service
 * API functions for admin moderation workflow
 */

import apiClient from "./client";
import type { PaginatedResponse, SharedResource } from "./community.service";

// ============================================================================
// TYPES
// ============================================================================

export interface ModerationActionRequest {
  resourceId: string;
  action: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
  feedback?: string;
}

// ============================================================================
// ADMIN MODERATION ENDPOINTS
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