/**
 * Check-in Service: "Como correu a aula?" (class state). Gated by the `class_state_enabled` flag.
 */

import type {
  CheckInRecord,
  CheckInSubmission,
  ConfirmAllCheckInsResult,
  PendingCheckIn,
} from "@/shared/types/check-in";
import apiClient from "./client";

export const checkInService = {
  /** Lessons from the last 7 days, before today, that still need a check-in. Newest first. */
  getPending: (limit = 20) =>
    apiClient
      .get<PendingCheckIn[]>("/check-ins/pending", { params: { limit } })
      .then((r) => r.data),

  submit: (timetableId: string, slotId: string, body: CheckInSubmission) =>
    apiClient
      .post<CheckInRecord>(
        `/timetable/${encodeURIComponent(timetableId)}/lessons/${encodeURIComponent(slotId)}/check-in`,
        body,
      )
      .then((r) => r.data),

  /** Marks every pending lesson as taught (all turmas when `timetableId` is omitted). */
  confirmAll: (timetableId?: string) =>
    apiClient
      .post<ConfirmAllCheckInsResult>("/check-ins/confirm-all", timetableId ? { timetableId } : {})
      .then((r) => r.data),
};
