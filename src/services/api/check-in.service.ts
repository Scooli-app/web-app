/**
 * Check-in Service: "Como correu a aula?" (class state). Gated by the `class_state_enabled` flag.
 */

import type {
  CheckInRecord,
  CheckInSubmission,
  ConfirmAllCheckInsResult,
  PendingCheckIn,
  ReinforcementResult,
  ShiftFollowingResult,
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

  /** Moves the content of the lessons after a not-held lesson forward one slot (ENG-194). */
  shiftFollowing: (timetableId: string, slotId: string) =>
    apiClient
      .post<ShiftFollowingResult>(
        `/timetable/${encodeURIComponent(timetableId)}/lessons/${encodeURIComponent(slotId)}/shift-following`,
      )
      .then((r) => r.data),

  /**
   * Asks for a reinforcement sheet for the difficult outcomes of one lesson (ENG-208). 409 when one is already being
   * prepared, 402 / 403 when the plan blocks it (the API client opens the upgrade modal for those).
   */
  requestReinforcement: (timetableId: string, slotId: string, outcomeIds: string[]) =>
    apiClient
      .post<ReinforcementResult>(
        `/timetable/${encodeURIComponent(timetableId)}/lessons/${encodeURIComponent(slotId)}/reinforcement`,
        { outcomeIds },
      )
      .then((r) => r.data),

  /** Marks every pending lesson as taught (all turmas when `timetableId` is omitted). */
  confirmAll: (timetableId?: string) =>
    apiClient
      .post<ConfirmAllCheckInsResult>("/check-ins/confirm-all", timetableId ? { timetableId } : {})
      .then((r) => r.data),
};
