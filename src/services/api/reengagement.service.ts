/**
 * Reengagement Service
 * Public, unauthenticated capture of "reason" clicks from the stale-user
 * re-engagement email. See chalkboard's ReengagementResource — the request
 * is only accepted with a valid signed token, not because the caller is
 * logged in (the whole premise is that they aren't currently using the app).
 */
import apiClient from "./client";

export interface ReengagementReasonPayload {
  email: string;
  reason: string;
  token: string;
}

export async function submitReengagementReason(
  payload: ReengagementReasonPayload,
): Promise<void> {
  await apiClient.post("/public/reengagement/reason", payload);
}
