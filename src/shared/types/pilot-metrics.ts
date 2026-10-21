/** Admin pilot metrics report (ENG-307 backend, consumed by ENG-308). Mirrors `GET /admin/pilot-metrics`. */

export interface PilotTopicCounts {
  accepted: number;
  rejected: number;
  pending: number;
}

/** `rejected` counts the suggestions an AI revision replaced while they were still pending. */
export interface PilotDocCounts {
  appliedAll: number;
  appliedPartial: number;
  rejected: number;
  pending: number;
}

export interface PilotReplanCounts {
  accepted: number;
  partiallyAccepted: number;
  rejected: number;
  failed: number;
  noChange: number;
  pending: number;
}

/** The counters of one teacher, turma and ISO week, or a sum of several. */
export interface PilotMetricsCounts {
  lessonsDue: number;
  answered: number;
  assumed: number;
  unanswered: number;
  notHeld: number;
  partial: number;
  difficulties: number;
  topicProposals: PilotTopicCounts;
  docSuggestions: PilotDocCounts;
  replans: PilotReplanCounts;
  loopStarted: number;
  loopCompleted: number;
}

export interface PilotMetricsRow extends PilotMetricsCounts {
  userId: string;
  teacherEmail: string;
  timetableId: string;
  turmaTitle: string;
  /** ISO week label, e.g. `2026-W42`. */
  week: string;
  /** The teacher answered, accepted or rejected anything that week. */
  active: boolean;
}

export interface PilotMetricsTotals extends PilotMetricsCounts {
  /** answered / lessonsDue, or 0 when no lesson was due. */
  answerRate: number;
  /** Week label to number of active teachers. */
  activeTeachersByWeek: Record<string, number>;
}

export interface PilotMetricsReport {
  /** Every ISO week of the range, oldest first. */
  weeks: string[];
  rows: PilotMetricsRow[];
  totals: PilotMetricsTotals;
}
