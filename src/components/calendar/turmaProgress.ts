import type { TurmaProgress, TurmaProgressFlaggedOutcome, TurmaProgressSlotCounts } from "@/shared/types/progress";

/** How many flagged outcomes the panel shows before "ver mais". */
export const FLAGGED_PREVIEW_LIMIT = 5;

/** The panel loads only with the `class_state_enabled` flag on and a turma to ask about. */
export function shouldLoadTurmaProgress(enabled: boolean, timetableId: string): boolean {
  return enabled && timetableId.length > 0;
}

/** "74%", or the dash when the turma has no outcomes to measure against. */
export function formatCoveragePercent(percent: number | null): string {
  return percent === null ? "—" : `${percent}%`;
}

/** Width of the coverage bar, 0 to 100. A null percent draws an empty bar. */
export function coverageBarWidth(percent: number | null): number {
  if (percent === null || Number.isNaN(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/** Lessons that count as given: taught, plus those assumed taught. */
export function lessonsGiven(counts: TurmaProgressSlotCounts): number {
  return counts.taught + counts.assumedTaught;
}

/** The flagged outcomes to list: the first few, or all of them once expanded. */
export function visibleFlaggedOutcomes(
  outcomes: TurmaProgressFlaggedOutcome[],
  expanded: boolean,
): TurmaProgressFlaggedOutcome[] {
  return expanded ? outcomes : outcomes.slice(0, FLAGGED_PREVIEW_LIMIT);
}

/**
 * What the reinforce row of a flagged outcome offers:
 * - "generating": its worksheet is being written (show the progress, no action);
 * - "ready": a finished worksheet to open;
 * - "request": no usable worksheet (none, or it failed) and a lesson to ask from, so "Gerar ficha";
 * - "unavailable": no worksheet and no source lesson on the backend (an older build), so no action.
 */
export type ReinforcementState = "generating" | "ready" | "request" | "unavailable";

export function reinforcementState(outcome: TurmaProgressFlaggedOutcome): ReinforcementState {
  const status = outcome.reinforcement?.status;
  if (status === "generating") return "generating";
  if (status === "completed") return "ready";
  return outcome.lastSignalSlotId ? "request" : "unavailable";
}

/** Whether there is anything to say about the turma's progress at all. */
export function hasProgressData(progress: TurmaProgress): boolean {
  return progress.coverage.outcomesTotal > 0 || progress.slots.past > 0;
}

/** A date for a line of text, e.g. "segunda-feira, 5 de outubro". */
export function formatProgressDate(isoDate: string, intlLocale: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
