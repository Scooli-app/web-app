/** Turma progress view (ENG-204). Contract: chalkboard PR #283, `GET /timetable/{id}/progress`. */

export type FlaggedOutcomeState = "covered" | "partial" | "assumed" | "not_covered";

export interface TurmaProgressCoverage {
  /** Outcomes (AE) planned for this turma. */
  outcomesTotal: number;
  /** Confirmed as taught by the teacher. */
  outcomesCovered: number;
  outcomesPartial: number;
  /**
   * Outcomes only an unanswered lesson (assumed taught) teaches. Not confirmed: not in `outcomesCovered` nor in
   * `percent`. Optional so the panel still renders against a backend without it (then none).
   */
  outcomesAssumed?: number;
  /** Confirmed outcomes as a percentage of the planned ones. Null when the turma has no outcomes to measure against. */
  percent: number | null;
  /** The year's AE catalogue for the subject and grade. */
  curriculumTotal: number;
}

export interface TurmaProgressSlotCounts {
  planned: number;
  taught: number;
  partiallyTaught: number;
  notHeld: number;
  assumedTaught: number;
}

export interface TurmaProgressSlots {
  /** Past lessons of this turma. */
  past: number;
  counts: TurmaProgressSlotCounts;
  pendingCheckIns: number;
}

export interface TurmaProgressBehindItem {
  unitOrder: number;
  label: string;
  /** YYYY-MM-DD */
  plannedDate: string;
  lessonsBehind: number;
  uncoveredOutcomes: number;
}

export interface TurmaProgressBehindSchedule {
  lessonsBehind: number;
  items: TurmaProgressBehindItem[];
}

/** A reinforcement worksheet made for an outcome (chalkboard: `reinforcement` on a flagged outcome). */
export interface TurmaProgressReinforcement {
  documentId: string;
  /** The lesson the worksheet was written for. */
  targetSlotId: string;
  /** YYYY-MM-DD of that lesson. */
  targetDate: string;
  status: "generating" | "completed" | "failed";
}

export interface TurmaProgressFlaggedOutcome {
  outcomeId: string;
  text: string;
  topicPath: string[];
  difficultyCount: number;
  /** YYYY-MM-DD of the latest signal from a check-in. */
  lastSignalDate: string;
  state: FlaggedOutcomeState;
  /**
   * The lesson where the latest difficulty was reported: the source of a reinforcement request. Optional so the
   * panel still renders against a backend that does not send it; without it the panel offers no "Gerar ficha".
   */
  lastSignalSlotId?: string | null;
  /** The worksheet that covers this outcome, or null. Absent on a backend without it. */
  reinforcement?: TurmaProgressReinforcement | null;
}

export interface TurmaProgressNextAssessment {
  slotId: string;
  /** YYYY-MM-DD */
  date: string;
  topicTitle: string;
}

export interface TurmaProgress {
  /** YYYY-MM-DD, the day the figures were computed for. */
  asOf: string;
  coverage: TurmaProgressCoverage;
  slots: TurmaProgressSlots;
  behindSchedule: TurmaProgressBehindSchedule;
  flaggedOutcomes: TurmaProgressFlaggedOutcome[];
  nextAssessment: TurmaProgressNextAssessment | null;
}
