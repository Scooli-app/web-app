import type {
  CheckInOutcome,
  CheckInResult,
  CheckInSubmission,
  MissingAmount,
  PendingCheckIn,
} from "@/shared/types/check-in";

/** Removes one pending check-in, returning where it was so a failed save can put it back. */
export function withoutCheckIn(
  items: PendingCheckIn[],
  slotId: string,
): { items: PendingCheckIn[]; index: number } {
  const index = items.findIndex((item) => item.slotId === slotId);
  if (index === -1) return { items, index };
  return { items: [...items.slice(0, index), ...items.slice(index + 1)], index };
}

/** Puts a check-in back at its old position (rollback after a failed save). */
export function withCheckInAt(
  items: PendingCheckIn[],
  item: PendingCheckIn,
  index: number,
): PendingCheckIn[] {
  if (items.some((existing) => existing.slotId === item.slotId)) return items;
  const at = Math.min(Math.max(index, 0), items.length);
  return [...items.slice(0, at), item, ...items.slice(at)];
}

export function isAssessmentCheckIn(item: Pick<PendingCheckIn, "slotType">): boolean {
  return item.slotType === "ASSESSMENT";
}

/**
 * "Correram todas bem" confirms lessons only: a test has its own question ("Já aplicaste o
 * teste?"), so the backend leaves assessments pending and they stay in the queue.
 */
export function afterConfirmAll(items: readonly PendingCheckIn[]): PendingCheckIn[] {
  return items.filter(isAssessmentCheckIn);
}

/** How many items "Correram todas bem" would confirm. */
export function confirmableCount(items: readonly PendingCheckIn[]): number {
  return items.filter((item) => !isAssessmentCheckIn(item)).length;
}

/**
 * "Com dificuldades" and "ficou a meio" open the detail step: the outcomes when the slot has some, the note,
 * and for "ficou a meio" how much was left. A slot with no outcomes still gets the step, without the outcome list.
 */
export function needsDetailStep(result: CheckInResult): boolean {
  return result === "TAUGHT_WITH_DIFFICULTIES" || result === "PARTIAL";
}

/**
 * The outcomes ticked when the outcome step opens: a single outcome is ticked (the answer is almost always about
 * it), several start unticked so the teacher names them.
 */
export function initialOutcomeSelection(outcomes: readonly Pick<CheckInOutcome, "id">[]): string[] {
  return outcomes.length === 1 ? [outcomes[0].id] : [];
}

/** The optional extras the outcome step collects: how much was left (PARTIAL only) and a note. */
export interface SubmissionExtras {
  missingAmount?: MissingAmount;
  note?: string;
}

/**
 * The POST body for a result. Outcome ids are sent only when the teacher picked some;
 * "Guardar" with nothing ticked is the same as the bare result. The amount goes only with PARTIAL,
 * and the note (trimmed, left out when blank) with any result but TAUGHT.
 */
export function buildSubmission(
  result: CheckInResult,
  selectedOutcomeIds: readonly string[] = [],
  extras: SubmissionExtras = {},
): CheckInSubmission {
  const ids = [...selectedOutcomeIds];
  const body: CheckInSubmission = { result };
  if (result === "TAUGHT_WITH_DIFFICULTIES" && ids.length > 0) body.difficultOutcomeIds = ids;
  if (result === "PARTIAL" && ids.length > 0) body.uncoveredOutcomeIds = ids;
  if (result === "PARTIAL" && extras.missingAmount) body.missingAmount = extras.missingAmount;
  const note = extras.note?.trim() ?? "";
  if (result !== "TAUGHT" && note.length > 0) body.note = note;
  return body;
}

/** The longest note the API takes (ENG-253). */
export const NOTE_MAX_LENGTH = 500;

/** Loads the pending list only when the flag is on: with it off, no request goes out. */
export async function loadPendingCheckIns(
  enabled: boolean,
  load: (limit: number) => Promise<PendingCheckIn[]>,
  limit = 20,
): Promise<PendingCheckIn[]> {
  if (!enabled) return [];
  return load(limit);
}

/** Pending items minus the ones set aside for this session ("Ainda não"). */
export function visibleCheckIns(items: readonly PendingCheckIn[], skipped: readonly string[]): PendingCheckIn[] {
  return items.filter((item) => !skipped.includes(item.slotId));
}

/** The strip shows only with the flag on, not dismissed for this session, and something to answer. */
export function shouldShowCheckInStrip(state: { enabled: boolean; dismissed: boolean; visibleCount: number }): boolean {
  return state.enabled && !state.dismissed && state.visibleCount > 0;
}
