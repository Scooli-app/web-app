import { describe, expect, it } from "vitest";
import type { TurmaProgress, TurmaProgressCoverage, TurmaProgressFlaggedOutcome } from "@/shared/types/progress";
import {
  FLAGGED_PREVIEW_LIMIT,
  coverageBarSegments,
  coverageBarWidth,
  formatProgressDate,
  formatCoveragePercent,
  hasProgressData,
  lessonsGiven,
  reinforcementState,
  shouldLoadTurmaProgress,
  unconfirmedOutcomes,
  visibleFlaggedOutcomes,
} from "./turmaProgress";

describe("unconfirmed coverage (ENG-239)", () => {
  const coverage = (over: Partial<TurmaProgressCoverage> = {}): TurmaProgressCoverage => ({
    outcomesTotal: 4,
    outcomesCovered: 2,
    outcomesPartial: 0,
    percent: 50,
    curriculumTotal: 10,
    ...over,
  });

  it("counts the unconfirmed outcomes, and none from a backend without the field", () => {
    expect(unconfirmedOutcomes(coverage({ outcomesAssumed: 1 }))).toBe(1);
    expect(unconfirmedOutcomes(coverage())).toBe(0);
  });

  it("draws the confirmed share solid and the unconfirmed share after it, on the same planned scope", () => {
    expect(coverageBarSegments(coverage({ outcomesAssumed: 1 }))).toEqual({ confirmed: 50, unconfirmed: 25 });
  });

  it("never draws past the full bar", () => {
    expect(coverageBarSegments(coverage({ percent: 75, outcomesCovered: 3, outcomesAssumed: 2 }))).toEqual({
      confirmed: 75,
      unconfirmed: 25,
    });
  });

  it("draws no unconfirmed share when there is nothing planned, or nothing unconfirmed", () => {
    expect(coverageBarSegments(coverage({ outcomesTotal: 0, percent: null, outcomesCovered: 0 }))).toEqual({
      confirmed: 0,
      unconfirmed: 0,
    });
    expect(coverageBarSegments(coverage())).toEqual({ confirmed: 50, unconfirmed: 0 });
  });
});

describe("reinforcementState", () => {
  const flagged = (over: Partial<TurmaProgressFlaggedOutcome> = {}): TurmaProgressFlaggedOutcome => ({
    outcomeId: "o1",
    text: "Frações",
    topicPath: [],
    difficultyCount: 1,
    lastSignalDate: "2026-10-08",
    state: "not_covered",
    lastSignalSlotId: "s2",
    reinforcement: null,
    ...over,
  });
  const worksheet = (status: "generating" | "completed" | "failed") => ({
    documentId: "d1",
    targetSlotId: "s3",
    targetDate: "2026-10-20",
    status,
  });

  it("offers a request when there is no worksheet and a lesson to ask from", () => {
    expect(reinforcementState(flagged())).toBe("request");
  });

  it("offers a request again after a worksheet failed", () => {
    expect(reinforcementState(flagged({ reinforcement: worksheet("failed") }))).toBe("request");
  });

  it("shows progress while a worksheet is being written, and a finished one as ready", () => {
    expect(reinforcementState(flagged({ reinforcement: worksheet("generating") }))).toBe("generating");
    expect(reinforcementState(flagged({ reinforcement: worksheet("completed") }))).toBe("ready");
  });

  it("offers nothing without a source lesson, as on a backend that does not send it", () => {
    expect(reinforcementState(flagged({ lastSignalSlotId: null }))).toBe("unavailable");
    expect(reinforcementState(flagged({ lastSignalSlotId: undefined }))).toBe("unavailable");
  });
});

const outcome = (n: number): TurmaProgressFlaggedOutcome => ({
  outcomeId: `o${n}`,
  text: `Aprendizagem ${n}`,
  topicPath: [],
  difficultyCount: 1,
  lastSignalDate: "2026-10-08",
  state: "not_covered",
});

const progress = (over: Partial<TurmaProgress["coverage"]> & { past?: number } = {}): TurmaProgress => ({
  asOf: "2026-10-19",
  coverage: { outcomesTotal: 0, outcomesCovered: 0, outcomesPartial: 0, percent: null, curriculumTotal: 0, ...over },
  slots: {
    past: over.past ?? 0,
    counts: { planned: 0, taught: 0, partiallyTaught: 0, notHeld: 0, assumedTaught: 0 },
    pendingCheckIns: 0,
  },
  behindSchedule: { lessonsBehind: 0, items: [] },
  flaggedOutcomes: [],
  nextAssessment: null,
});

describe("shouldLoadTurmaProgress", () => {
  it("never asks for progress with the flag off", () => {
    expect(shouldLoadTurmaProgress(false, "tt-1")).toBe(false);
  });

  it("asks with the flag on and a turma id", () => {
    expect(shouldLoadTurmaProgress(true, "tt-1")).toBe(true);
    expect(shouldLoadTurmaProgress(true, "")).toBe(false);
  });
});

describe("formatCoveragePercent", () => {
  it("shows the percent, or the dash when null", () => {
    expect(formatCoveragePercent(100)).toBe("100%");
    expect(formatCoveragePercent(0)).toBe("0%");
    expect(formatCoveragePercent(null)).toBe("—");
  });
});

describe("coverageBarWidth", () => {
  it("clamps to 0..100 and draws nothing for null", () => {
    expect(coverageBarWidth(null)).toBe(0);
    expect(coverageBarWidth(42)).toBe(42);
    expect(coverageBarWidth(150)).toBe(100);
    expect(coverageBarWidth(-3)).toBe(0);
  });
});

describe("lessonsGiven", () => {
  it("counts taught and assumed-taught lessons", () => {
    expect(
      lessonsGiven({ planned: 2, taught: 1, partiallyTaught: 1, notHeld: 1, assumedTaught: 2 }),
    ).toBe(3);
  });
});

describe("visibleFlaggedOutcomes", () => {
  const many = Array.from({ length: 8 }, (_, i) => outcome(i + 1));

  it("previews the first few until expanded", () => {
    expect(visibleFlaggedOutcomes(many, false)).toHaveLength(FLAGGED_PREVIEW_LIMIT);
    expect(visibleFlaggedOutcomes(many, true)).toHaveLength(8);
  });

  it("keeps short lists whole", () => {
    expect(visibleFlaggedOutcomes([outcome(1)], false)).toEqual([outcome(1)]);
  });
});

describe("hasProgressData", () => {
  it("is false for a brand-new turma with nothing planned or taught", () => {
    expect(hasProgressData(progress())).toBe(false);
  });

  it("is true once outcomes are planned or lessons are past", () => {
    expect(hasProgressData(progress({ outcomesTotal: 2 }))).toBe(true);
    expect(hasProgressData(progress({ past: 1 }))).toBe(true);
  });
});

describe("formatProgressDate", () => {
  it("writes the weekday, day and month in the given locale", () => {
    expect(formatProgressDate("2026-10-05", "pt-PT")).toMatch(/5/);
    expect(formatProgressDate("2026-10-05", "pt-PT")).toMatch(/outubro/i);
  });
});
