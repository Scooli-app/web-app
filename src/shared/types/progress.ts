/** Turma progress view (ENG-204). Contract: chalkboard PR #283, `GET /timetable/{id}/progress`. */

export type FlaggedOutcomeState = "covered" | "partial" | "not_covered";

export interface TurmaProgressCoverage {
  /** Outcomes (AE) planned for this turma. */
  outcomesTotal: number;
  outcomesCovered: number;
  outcomesPartial: number;
  /** Null when the turma has no outcomes to measure against. */
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

export interface TurmaProgressFlaggedOutcome {
  outcomeId: string;
  text: string;
  topicPath: string[];
  difficultyCount: number;
  /** YYYY-MM-DD of the latest signal from a check-in. */
  lastSignalDate: string;
  state: FlaggedOutcomeState;
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
