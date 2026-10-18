import type {
  CheckInResult,
  CheckInSubmission,
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

export function isAssessmentCheckIn(item: PendingCheckIn): boolean {
  return item.slotType === "ASSESSMENT";
}

/** Difficulties and "ficou a meio" ask which outcomes, but only when the slot has some to pick from. */
export function needsOutcomeStep(
  result: CheckInResult,
  item: PendingCheckIn,
): boolean {
  return (result === "TAUGHT_WITH_DIFFICULTIES" || result === "PARTIAL") && item.outcomes.length > 0;
}

/**
 * The POST body for a result. Outcome ids are sent only when the teacher picked some;
 * "Saltar" on the chips step is the same as the bare result.
 */
export function buildSubmission(
  result: CheckInResult,
  selectedOutcomeIds: readonly string[] = [],
): CheckInSubmission {
  const ids = [...selectedOutcomeIds];
  if (result === "TAUGHT_WITH_DIFFICULTIES") {
    return ids.length > 0 ? { result, difficultOutcomeIds: ids } : { result };
  }
  if (result === "PARTIAL") {
    return ids.length > 0 ? { result, uncoveredOutcomeIds: ids } : { result };
  }
  return { result };
}

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
