/**
 * Check-in Service: "Como correu a aula?" (class state). Gated by the `class_state_enabled` flag.
 */

import type {
  CheckInRecord,
  CheckInSubmission,
  ConfirmAllCheckInsResult,
  CarryOverResult,
  PendingCheckIn,
  ReinforcementRequested,
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

  /** Marks every pending lesson as taught (all turmas when `timetableId` is omitted). */
  confirmAll: (timetableId?: string) =>
    apiClient
      .post<ConfirmAllCheckInsResult>("/check-ins/confirm-all", timetableId ? { timetableId } : {})
      .then((r) => r.data),

  /** Asks for a reinforcement worksheet on the next lesson for the outcomes the lesson did not reach (ENG-236). */
  requestReinforcement: (timetableId: string, lessonId: string, outcomeIds: string[]) =>
    apiClient
      .post<ReinforcementRequested>(
        `/timetable/${encodeURIComponent(timetableId)}/lessons/${encodeURIComponent(lessonId)}/reinforcement`,
        { outcomeIds },
      )
      .then((r) => r.data),

  /** Carries the outcomes of a lesson over to the next lesson, idempotently (ENG-237). */
  carryOver: (timetableId: string, lessonId: string, outcomeIds: string[]) =>
    apiClient
      .post<CarryOverResult>(
        `/timetable/${encodeURIComponent(timetableId)}/lessons/${encodeURIComponent(lessonId)}/carry-over`,
        { outcomeIds },
      )
      .then((r) => r.data),
};
