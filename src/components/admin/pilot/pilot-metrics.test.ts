import type { PilotMetricsReport, PilotMetricsRow } from "@/shared/types/pilot-metrics";
import { describe, expect, it } from "vitest";
import {
  apiRange,
  buildPilotMetricsCsv,
  computeHeadlines,
  CSV_COLUMNS,
  defaultRange,
  EMPTY_COUNTS,
  groupByTurma,
  weekOptions,
} from "./pilot-metrics";

const TEACHER_A = "11111111-1111-1111-1111-111111111111";
const TEACHER_B = "22222222-2222-2222-2222-222222222222";
const TURMA_1 = "aaaaaaaa-0000-0000-0000-000000000001";
const TURMA_2 = "aaaaaaaa-0000-0000-0000-000000000002";
const TEACHER_C = "33333333-3333-3333-3333-333333333333";
const TURMA_3 = "aaaaaaaa-0000-0000-0000-000000000003";

function row(overrides: Partial<PilotMetricsRow>): PilotMetricsRow {
  return {
    ...structuredClone(EMPTY_COUNTS),
    userId: "",
    teacherEmail: "",
    timetableId: "",
    turmaTitle: "",
    week: "",
    active: false,
    ...overrides,
  };
}

/**
 * A two-week fixture with two teachers and one turma each.
 *   A / 9.º A  W41: 4 of 4 answered, 1 topic accepted, loop 1 of 1
 *   B / 9.º B  W41: 1 of 4 answered, 2 unanswered, 2 document suggestions rejected by a newer revision,
 *              1 replan partly accepted and 1 rejected, loop 0 of 2
 *   A / 9.º A  W42: 2 of 2 answered, 1 topic rejected
 *   B / 9.º B  W42: 1 of 2 answered, 1 document suggestion partly applied
 */
const rows: PilotMetricsRow[] = [
  row({
    userId: TEACHER_A, teacherEmail: "ana@escola.pt", timetableId: TURMA_1, turmaTitle: "9.º A", week: "2026-W41",
    active: true, lessonsDue: 4, answered: 4,
    topicProposals: { accepted: 1, rejected: 0, pending: 1 }, loopStarted: 1, loopCompleted: 1,
  }),
  row({
    userId: TEACHER_B, teacherEmail: "bruno@escola.pt", timetableId: TURMA_2, turmaTitle: "9.º B, manhã", week: "2026-W41",
    active: false, lessonsDue: 4, answered: 1, unanswered: 2, assumed: 1,
    docSuggestions: { appliedAll: 1, appliedPartial: 0, rejected: 2, pending: 0 },
    replans: { accepted: 0, partiallyAccepted: 1, rejected: 1, failed: 0, noChange: 0, pending: 0 },
    loopStarted: 2, loopCompleted: 0,
  }),
  row({
    userId: TEACHER_A, teacherEmail: "ana@escola.pt", timetableId: TURMA_1, turmaTitle: "9.º A", week: "2026-W42",
    active: true, lessonsDue: 2, answered: 2,
    topicProposals: { accepted: 0, rejected: 1, pending: 0 },
  }),
  row({
    userId: TEACHER_B, teacherEmail: "bruno@escola.pt", timetableId: TURMA_2, turmaTitle: "9.º B, manhã", week: "2026-W42",
    active: true, lessonsDue: 2, answered: 1, unanswered: 1,
    docSuggestions: { appliedAll: 0, appliedPartial: 1, rejected: 0, pending: 0 },
  }),
];

const report: PilotMetricsReport = {
  weeks: ["2026-W41", "2026-W42"],
  rows,
  totals: { ...EMPTY_COUNTS, answerRate: 0, activeTeachersByWeek: {} },
};

describe("computeHeadlines", () => {
  const headlines = computeHeadlines(report);

  it("computes the answer rate over every lesson due in the range", () => {
    expect(headlines.lessonsDue).toBe(12);
    expect(headlines.answered).toBe(8);
    expect(headlines.answerRate).toBeCloseTo(8 / 12);
  });

  it("counts teachers active in the last week of the range", () => {
    // In W42 both teachers answered, accepted or rejected something.
    expect(headlines.activeTeachers).toBe(2);
    expect(headlines.teachersInPilot).toBe(2);
  });

  it("counts accepted and partly accepted proposals over the decided ones", () => {
    // Accepted: topic 1, document applied in full 1, document applied in part 1 (W41 + W42), replan partly 1.
    expect(headlines.proposalsAccepted).toBe(4);
    // Decided adds topic rejected 1 and replan rejected 1. The 2 document suggestions replaced by a newer revision are not decisions.
    expect(headlines.proposalsDecided).toBe(6);
    expect(headlines.proposalAcceptRate).toBeCloseTo(4 / 6);
  });

  it("computes loop completion as completed over started", () => {
    expect(headlines.loopStarted).toBe(3);
    expect(headlines.loopCompleted).toBe(1);
    expect(headlines.loopCompletionRate).toBeCloseTo(1 / 3);
  });

  it("returns null rates when there is nothing to divide by", () => {
    const empty = computeHeadlines({ weeks: [], rows: [], totals: { ...EMPTY_COUNTS, answerRate: 0, activeTeachersByWeek: {} } });
    expect(empty.answerRate).toBeNull();
    expect(empty.proposalAcceptRate).toBeNull();
    expect(empty.loopCompletionRate).toBeNull();
    expect(empty.activeTeachers).toBe(0);
  });
});

describe("groupByTurma", () => {
  const groups = groupByTurma(rows);

  it("makes one group per teacher and turma, lowest answer rate first", () => {
    expect(groups.map((g) => g.teacherEmail)).toEqual(["bruno@escola.pt", "ana@escola.pt"]);
    expect(groups[0].answerRate).toBeCloseTo(2 / 6);
    expect(groups[1].answerRate).toBeCloseTo(6 / 6);
  });

  it("keeps each week of a group keyed by its ISO label", () => {
    expect(groups[0].byWeek["2026-W41"].answered).toBe(1);
    expect(groups[0].byWeek["2026-W42"].answered).toBe(1);
  });

  it("puts groups with no lesson due last", () => {
    const withoutDue = groupByTurma([
      row({ userId: TEACHER_C, teacherEmail: "z@escola.pt", timetableId: TURMA_3, turmaTitle: "9.º C", week: "2026-W40", lessonsDue: 0 }),
      ...rows,
    ]);
    expect(withoutDue.at(-1)?.teacherEmail).toBe("z@escola.pt");
    expect(withoutDue.at(-1)?.answerRate).toBeNull();
  });
});

describe("buildPilotMetricsCsv", () => {
  const lines = buildPilotMetricsCsv(rows).split("\r\n");

  it("writes the header and one line per raw row, with CRLF endings", () => {
    expect(lines[0]).toBe(CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(rows.length + 2);
    expect(buildPilotMetricsCsv(rows).endsWith("\r\n")).toBe(true);
  });

  it("writes the raw counters of a row in column order", () => {
    expect(lines[1]).toBe(
      [
        // identity
        "2026-W41", "ana@escola.pt", "9.º A", TEACHER_A, TURMA_1,
        // lessons: due, answered, assumed, unanswered, not held, partial, difficulties
        "4", "4", "0", "0", "0", "0", "0",
        // topic proposals: accepted, rejected, pending
        "1", "0", "1",
        // document suggestions: applied all, applied partial, rejected, pending
        "0", "0", "0", "0",
        // replans: accepted, partially accepted, rejected, failed, no change, pending
        "0", "0", "0", "0", "0", "0",
        // loop: started, completed, active
        "1", "1", "true",
      ].join(","),
    );
  });

  it("quotes values that contain commas", () => {
    expect(lines[2]).toContain(',"9.º B, manhã",');
  });
});

describe("range helpers", () => {
  it("opens on the last six weeks, the current one included", () => {
    // 21 October 2026 is a Wednesday, so the current week starts on Monday 19 October.
    expect(defaultRange(new Date(2026, 9, 21))).toEqual({ fromWeek: "2026-09-14", toWeek: "2026-10-19" });
  });

  it("sends the first Monday and the Sunday of the last week", () => {
    expect(apiRange("2026-09-14", "2026-10-19")).toEqual({ from: "2026-09-14", to: "2026-10-25" });
  });

  it("offers 52 weeks, newest first", () => {
    const options = weekOptions(new Date(2026, 9, 21));
    expect(options).toHaveLength(52);
    expect(options[0]).toBe("2026-10-19");
    expect(options.at(-1)).toBe("2025-10-27");
  });
});
