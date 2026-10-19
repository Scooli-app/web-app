import { buildSubmission, needsOutcomeStep } from "@/hooks/checkInQueue";
import { checkInService } from "@/services/api/check-in.service";
import { getPreviousCheckIn, type PreviousLessonCheckIn } from "@/services/api/timetable.service";
import type { CheckInResult, CheckInSubmission } from "@/shared/types/check-in";

/**
 * The prompt shows only with the flag on, a previous lesson to ask about, no "Agora não" yet, and when
 * the dialog's own slot is not itself checkable: a past lesson gets its own question in the dialog, so two
 * prompts would ask about two lessons at once.
 */
export function previousCheckInVisible(state: {
  enabled: boolean;
  pending: PreviousLessonCheckIn | null;
  hidden: boolean;
  dialogSlotCheckable: boolean;
}): boolean {
  return state.enabled && state.pending !== null && !state.hidden && !state.dialogSlotCheckable;
}

/** What the prompt shows after a save: the short confirmation, or null when the save failed. */
export type SavedPhase = "saved" | "savedWithContext";

export function phaseAfterSave(saved: boolean, result: CheckInResult): SavedPhase | null {
  if (!saved) return null;
  return feedsNextLesson(result) ? "savedWithContext" : "saved";
}

/**
 * Loads the previous lesson's check-in only when the flag is on, so with it off no request goes out.
 * A failed load is treated as "nothing to ask": generation never waits on this prompt.
 */
export async function loadPreviousCheckIn(
  enabled: boolean,
  timetableId: string,
  lessonId: string,
  load: (timetableId: string, lessonId: string) => Promise<PreviousLessonCheckIn | null> = getPreviousCheckIn,
): Promise<PreviousLessonCheckIn | null> {
  if (!enabled) return null;
  try {
    return await load(timetableId, lessonId);
  } catch {
    return null;
  }
}

/** Saves the answer as a normal check-in on the previous lesson. Resolves false when the save fails. */
export async function answerPreviousLesson(
  timetableId: string,
  pending: PreviousLessonCheckIn,
  body: CheckInSubmission,
  save: (timetableId: string, slotId: string, body: CheckInSubmission) => Promise<unknown> = (...args) =>
    checkInService.submit(...args),
): Promise<boolean> {
  try {
    await save(timetableId, pending.slotId, body);
    return true;
  } catch {
    return false;
  }
}

/** Difficulties and "ficou a meio" offer outcome chips, but only when the previous lesson has outcomes. */
export function needsPreviousOutcomeStep(result: CheckInResult, pending: PreviousLessonCheckIn): boolean {
  return needsOutcomeStep(result, pending);
}

/** The POST body for a result and the chips the teacher picked (none picked means the bare result). */
export function previousSubmission(result: CheckInResult, selectedOutcomeIds: readonly string[] = []): CheckInSubmission {
  return buildSubmission(result, selectedOutcomeIds);
}

/** Whether the answer changes the next lesson's plan (the backend feeds difficulties and partial lessons forward). */
export function feedsNextLesson(result: CheckInResult): boolean {
  return result === "TAUGHT_WITH_DIFFICULTIES" || result === "PARTIAL";
}
