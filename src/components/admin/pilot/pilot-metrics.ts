import type {
  PilotMetricsCounts,
  PilotMetricsReport,
  PilotMetricsRow,
} from "@/shared/types/pilot-metrics";
import { addDaysIso, isoWeekStart } from "@/shared/utils/week";

/** The default range is the last six ISO weeks, the current one included. */
export const DEFAULT_RANGE_WEEKS = 6;

/** The week pickers list this many weeks back from the current one. */
export const WEEK_OPTIONS = 52;

export const EMPTY_COUNTS: PilotMetricsCounts = {
  lessonsDue: 0,
  answered: 0,
  assumed: 0,
  unanswered: 0,
  notHeld: 0,
  partial: 0,
  difficulties: 0,
  topicProposals: { accepted: 0, rejected: 0, pending: 0 },
  docSuggestions: { appliedAll: 0, appliedPartial: 0, rejected: 0, pending: 0 },
  replans: { accepted: 0, partiallyAccepted: 0, rejected: 0, failed: 0, noChange: 0, pending: 0 },
  loopStarted: 0,
  loopCompleted: 0,
};

/** Sums the counters of several rows or reports. Every counter is a count, so sums are plain additions. */
export function sumCounts(items: PilotMetricsCounts[]): PilotMetricsCounts {
  return items.reduce<PilotMetricsCounts>(
    (sum, c) => ({
      lessonsDue: sum.lessonsDue + c.lessonsDue,
      answered: sum.answered + c.answered,
      assumed: sum.assumed + c.assumed,
      unanswered: sum.unanswered + c.unanswered,
      notHeld: sum.notHeld + c.notHeld,
      partial: sum.partial + c.partial,
      difficulties: sum.difficulties + c.difficulties,
      topicProposals: {
        accepted: sum.topicProposals.accepted + c.topicProposals.accepted,
        rejected: sum.topicProposals.rejected + c.topicProposals.rejected,
        pending: sum.topicProposals.pending + c.topicProposals.pending,
      },
      docSuggestions: {
        appliedAll: sum.docSuggestions.appliedAll + c.docSuggestions.appliedAll,
        appliedPartial: sum.docSuggestions.appliedPartial + c.docSuggestions.appliedPartial,
        rejected: sum.docSuggestions.rejected + c.docSuggestions.rejected,
        pending: sum.docSuggestions.pending + c.docSuggestions.pending,
      },
      replans: {
        accepted: sum.replans.accepted + c.replans.accepted,
        partiallyAccepted: sum.replans.partiallyAccepted + c.replans.partiallyAccepted,
        rejected: sum.replans.rejected + c.replans.rejected,
        failed: sum.replans.failed + c.replans.failed,
        noChange: sum.replans.noChange + c.replans.noChange,
        pending: sum.replans.pending + c.replans.pending,
      },
      loopStarted: sum.loopStarted + c.loopStarted,
      loopCompleted: sum.loopCompleted + c.loopCompleted,
    }),
    EMPTY_COUNTS,
  );
}

/** A share of `part` over `whole`, or null when there is nothing to divide by. */
export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

/** The range the page opens on: the last six weeks, from the Monday of six weeks ago to this week's Monday. */
export function defaultRange(today: Date = new Date()): { fromWeek: string; toWeek: string } {
  const thisWeek = isoWeekStart(today);
  return { fromWeek: addDaysIso(thisWeek, -7 * (DEFAULT_RANGE_WEEKS - 1)), toWeek: thisWeek };
}

/** Monday dates of the weeks the pickers offer, newest first. */
export function weekOptions(today: Date = new Date()): string[] {
  const thisWeek = isoWeekStart(today);
  return Array.from({ length: WEEK_OPTIONS }, (_, i) => addDaysIso(thisWeek, -7 * i));
}

/** The API range for a pair of week pickers: from the first Monday through the Sunday of the last week. */
export function apiRange(fromWeek: string, toWeek: string): { from: string; to: string } {
  return { from: fromWeek, to: addDaysIso(toWeek, 6) };
}

export interface PilotHeadlines {
  answerRate: number | null;
  answered: number;
  lessonsDue: number;
  /** Teachers with activity in the last week of the range. */
  activeTeachers: number;
  /** Teachers with any row in the range. */
  teachersInPilot: number;
  proposalsAccepted: number;
  proposalsDecided: number;
  proposalAcceptRate: number | null;
  loopStarted: number;
  loopCompleted: number;
  loopCompletionRate: number | null;
}

/**
 * The four headline numbers of the range. Proposals accepted counts accepted and partly accepted outcomes of every
 * kind; proposals decided adds the rejections. Pending items are not decided. Document suggestions replaced by a newer
 * AI revision (`docSuggestions.rejected`) are not a teacher decision, so they are left out.
 */
export function computeHeadlines(report: PilotMetricsReport): PilotHeadlines {
  const total = sumCounts(report.rows);
  const lastWeek = report.weeks.at(-1);
  const activeTeachers = new Set(
    report.rows.filter((r) => r.active && r.week === lastWeek).map((r) => r.userId),
  );
  const teachersInPilot = new Set(report.rows.map((r) => r.userId));

  const proposalsAccepted =
    total.topicProposals.accepted +
    total.docSuggestions.appliedAll +
    total.docSuggestions.appliedPartial +
    total.replans.accepted +
    total.replans.partiallyAccepted;
  const proposalsDecided = proposalsAccepted + total.topicProposals.rejected + total.replans.rejected;

  return {
    answerRate: ratio(total.answered, total.lessonsDue),
    answered: total.answered,
    lessonsDue: total.lessonsDue,
    activeTeachers: activeTeachers.size,
    teachersInPilot: teachersInPilot.size,
    proposalsAccepted,
    proposalsDecided,
    proposalAcceptRate: ratio(proposalsAccepted, proposalsDecided),
    loopStarted: total.loopStarted,
    loopCompleted: total.loopCompleted,
    loopCompletionRate: ratio(total.loopCompleted, total.loopStarted),
  };
}

export interface PilotTurmaGroup {
  key: string;
  userId: string;
  teacherEmail: string;
  timetableId: string;
  turmaTitle: string;
  /** Rows keyed by ISO week label. */
  byWeek: Record<string, PilotMetricsRow>;
  total: PilotMetricsCounts;
  answerRate: number | null;
}

/**
 * One group per teacher and turma, sorted by answer rate ascending so the teachers who need attention come first.
 * Groups with no lesson due in the range have no rate and sort last; ties sort by teacher, then turma.
 */
export function groupByTurma(rows: PilotMetricsRow[]): PilotTurmaGroup[] {
  const groups = new Map<string, PilotMetricsRow[]>();
  for (const row of rows) {
    const key = `${row.userId}|${row.timetableId}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const result: PilotTurmaGroup[] = [...groups].map(([key, groupRows]) => {
    const first = groupRows[0];
    const total = sumCounts(groupRows);
    return {
      key,
      userId: first.userId,
      teacherEmail: first.teacherEmail,
      timetableId: first.timetableId,
      turmaTitle: first.turmaTitle,
      byWeek: Object.fromEntries(groupRows.map((r) => [r.week, r])),
      total,
      answerRate: ratio(total.answered, total.lessonsDue),
    };
  });

  return result.sort((a, b) => {
    if (a.answerRate !== b.answerRate) {
      if (a.answerRate === null) return 1;
      if (b.answerRate === null) return -1;
      return a.answerRate - b.answerRate;
    }
    return a.teacherEmail.localeCompare(b.teacherEmail) || a.turmaTitle.localeCompare(b.turmaTitle);
  });
}

export const CSV_COLUMNS = [
  "week",
  "teacherEmail",
  "turmaTitle",
  "userId",
  "timetableId",
  "lessonsDue",
  "answered",
  "assumed",
  "unanswered",
  "notHeld",
  "partial",
  "difficulties",
  "topicAccepted",
  "topicRejected",
  "topicPending",
  "docAppliedAll",
  "docAppliedPartial",
  "docRejected",
  "docPending",
  "replanAccepted",
  "replanPartiallyAccepted",
  "replanRejected",
  "replanFailed",
  "replanNoChange",
  "replanPending",
  "loopStarted",
  "loopCompleted",
  "active",
] as const;

function csvCell(value: string | number | boolean): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The raw rows as CSV: one line per teacher, turma and week, with a header line. Lines end with CRLF. */
export function buildPilotMetricsCsv(rows: PilotMetricsRow[]): string {
  const lines = rows.map((r) =>
    [
      r.week,
      r.teacherEmail,
      r.turmaTitle,
      r.userId,
      r.timetableId,
      r.lessonsDue,
      r.answered,
      r.assumed,
      r.unanswered,
      r.notHeld,
      r.partial,
      r.difficulties,
      r.topicProposals.accepted,
      r.topicProposals.rejected,
      r.topicProposals.pending,
      r.docSuggestions.appliedAll,
      r.docSuggestions.appliedPartial,
      r.docSuggestions.rejected,
      r.docSuggestions.pending,
      r.replans.accepted,
      r.replans.partiallyAccepted,
      r.replans.rejected,
      r.replans.failed,
      r.replans.noChange,
      r.replans.pending,
      r.loopStarted,
      r.loopCompleted,
      r.active,
    ].map(csvCell).join(","),
  );
  return [CSV_COLUMNS.join(","), ...lines].map((line) => `${line}\r\n`).join("");
}
