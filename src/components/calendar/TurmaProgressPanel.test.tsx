import type { TurmaProgress, TurmaProgressFlaggedOutcome } from "@/shared/types/progress";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TurmaProgressPanel, TurmaProgressView } from "./TurmaProgressPanel";

const state = vi.hoisted(() => ({ enabled: true }));
const service = vi.hoisted(() => ({ getTurmaProgress: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-PT",
}));
vi.mock("@/store/hooks", () => ({ useAppSelector: () => state.enabled }));
vi.mock("@/store/features/selectors", () => ({ selectIsClassStateEnabled: () => state.enabled }));
vi.mock("@/services/api/progress.service", () => ({ getTurmaProgress: service.getTurmaProgress }));
vi.mock("@/hooks/useCheckInFollowUps", () => ({
  useCheckInFollowUps: () => ({ reinforce: vi.fn(), carry: vi.fn() }),
  reinforcementTarget: vi.fn(),
}));
vi.mock("@/components/dashboard/WeekLessonDialog", () => ({ WeekLessonDialog: () => null }));

const outcome = (n: number): TurmaProgressFlaggedOutcome => ({
  outcomeId: `o${n}`,
  text: `Aprendizagem ${n}`,
  topicPath: ["Números"],
  difficultyCount: 2,
  lastSignalDate: "2026-10-18",
  state: "not_covered",
});

function progress(over: Partial<TurmaProgress> = {}): TurmaProgress {
  return {
    asOf: "2026-10-19",
    coverage: { outcomesTotal: 2, outcomesCovered: 2, outcomesPartial: 0, percent: 100, curriculumTotal: 3 },
    slots: {
      past: 6,
      counts: { planned: 2, taught: 1, partiallyTaught: 1, notHeld: 1, assumedTaught: 1 },
      pendingCheckIns: 1,
    },
    behindSchedule: {
      lessonsBehind: 1,
      items: [{ unitOrder: 2, label: "Números racionais", plannedDate: "2026-10-05", lessonsBehind: 1, uncoveredOutcomes: 1 }],
    },
    flaggedOutcomes: [outcome(1)],
    nextAssessment: { slotId: "s1", date: "2026-10-25", topicTitle: "Teste 1" },
    ...over,
  };
}

function renderView(data: TurmaProgress, extra: Partial<Parameters<typeof TurmaProgressView>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(TurmaProgressView, { progress: data, todayIso: "2026-10-19", ...extra }),
  );
}

beforeEach(() => {
  state.enabled = true;
  service.getTurmaProgress.mockReset();
});

describe("TurmaProgressPanel", () => {
  it("renders nothing with the flag off", () => {
    state.enabled = false;
    const html = renderToStaticMarkup(createElement(TurmaProgressPanel, { timetableId: "tt-1" }));
    expect(html).toBe("");
    expect(service.getTurmaProgress).not.toHaveBeenCalled();
  });

  it("shows the loading skeleton while the figures load", () => {
    const html = renderToStaticMarkup(createElement(TurmaProgressPanel, { timetableId: "tt-1" }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("loadingLabel");
  });
});

describe("TurmaProgressView layout", () => {
  it("names the panel and says what the percent measures", () => {
    const html = renderView(progress());
    expect(html).toContain("<h2");
    expect(html).toContain("coverageCaption");
  });

  it("shows the lesson counts as chips, dimming a zero count", () => {
    const html = renderView(progress());
    for (const key of ["given", "partial", "notHeld", "pending"]) {
      expect(html).toContain(key);
    }
    const zero = renderView(
      progress({ slots: { past: 0, counts: { planned: 0, taught: 0, partiallyTaught: 0, notHeld: 0, assumedTaught: 0 }, pendingCheckIns: 0 } }),
    );
    expect(zero).toContain("opacity-50");
    expect(html.match(/opacity-50/g)?.length ?? 0).toBeLessThan(zero.match(/opacity-50/g)?.length ?? 0);
  });

  it("gives each section its icon", () => {
    const html = renderView(progress());
    expect(html).toContain("lucide-clock");
    expect(html).toContain("lucide-target");
    expect(html).toContain("lucide-calendar-check");
  });

  it("clamps each flagged outcome to two lines, with the full text as its tooltip", () => {
    const html = renderView(progress({ flaggedOutcomes: [outcome(1)] }));
    expect(html).toContain('title="Aprendizagem 1"');
    expect(html).toContain("line-clamp-2");
  });
});

describe("TurmaProgressView reinforcement", () => {
  const withSource = (over: Partial<TurmaProgressFlaggedOutcome> = {}): TurmaProgressFlaggedOutcome => ({
    ...outcome(1),
    lastSignalSlotId: "s2",
    ...over,
  });

  it("offers Gerar ficha for an outcome without a worksheet, when the caller can request one", () => {
    const html = renderView(progress({ flaggedOutcomes: [withSource()] }), {
      onRequestReinforcement: vi.fn(),
    });
    expect(html).toContain("reinforcementGenerate");
  });

  it("offers no action without a handler, or without the source lesson", () => {
    expect(renderView(progress({ flaggedOutcomes: [withSource()] }))).not.toContain("reinforcementGenerate");
    const noSource = renderView(progress({ flaggedOutcomes: [outcome(1)] }), {
      onRequestReinforcement: vi.fn(),
    });
    expect(noSource).not.toContain("reinforcementGenerate");
  });

  it("shows a worksheet that is still being written as in progress, with no action", () => {
    const html = renderView(
      progress({
        flaggedOutcomes: [
          withSource({
            reinforcement: { documentId: "d1", targetSlotId: "s3", targetDate: "2026-10-20", status: "generating" },
          }),
        ],
      }),
      { onRequestReinforcement: vi.fn(), onOpenLesson: vi.fn() },
    );
    expect(html).toContain("reinforcementGenerating");
    expect(html).not.toContain("reinforcementGenerate<");
    expect(html).not.toContain("reinforcementReady");
  });

  it("shows a finished worksheet as ready, with Abrir", () => {
    const html = renderView(
      progress({
        flaggedOutcomes: [
          withSource({
            reinforcement: { documentId: "d1", targetSlotId: "s3", targetDate: "2026-10-20", status: "completed" },
          }),
        ],
      }),
      { onRequestReinforcement: vi.fn(), onOpenLesson: vi.fn() },
    );
    expect(html).toContain("reinforcementReady");
    expect(html).toContain(">open<");
  });

  it("says a failed worksheet failed and offers to try again", () => {
    const html = renderView(
      progress({
        flaggedOutcomes: [
          withSource({
            reinforcement: { documentId: "d1", targetSlotId: "s3", targetDate: "2026-10-20", status: "failed" },
          }),
        ],
      }),
      { onRequestReinforcement: vi.fn() },
    );
    expect(html).toContain("reinforcementFailed");
    expect(html).toContain("reinforcementRetry");
  });

  it("renders an older build's outcome without the new fields", () => {
    const old: TurmaProgressFlaggedOutcome = outcome(1);
    expect(() => renderView(progress({ flaggedOutcomes: [old] }), { onRequestReinforcement: vi.fn() })).not.toThrow();
  });
});

describe("TurmaProgressView", () => {
  it("shows the coverage percent and the count of outcomes", () => {
    const html = renderView(progress());
    expect(html).toContain("100%");
    expect(html).toContain("coverageCount");
    expect(html).toContain("coverageOfYear");
  });

  it("shows a dash, not a percent, when there is no coverage figure", () => {
    const html = renderView(
      progress({
        coverage: { outcomesTotal: 0, outcomesCovered: 0, outcomesPartial: 0, percent: null, curriculumTotal: 3 },
      }),
    );
    expect(html).toContain("—");
    expect(html).not.toMatch(/>\d+%</);
  });

  it("says all is on track when nothing is behind", () => {
    const html = renderView(progress({ behindSchedule: { lessonsBehind: 0, items: [] } }));
    expect(html).toContain("allOnTime");
    expect(html).not.toContain("Números racionais");
  });

  it("lists the topics behind schedule", () => {
    const html = renderView(progress());
    expect(html).toContain("Números racionais");
    expect(html).toContain("behindLessons");
    expect(html).not.toContain("allOnTime");
  });

  it("shows an empty reinforce state when no outcome is flagged", () => {
    const html = renderView(progress({ flaggedOutcomes: [] }));
    expect(html).toContain("reinforceEmpty");
  });

  it("previews at most five flagged outcomes and offers to see more", () => {
    const many = Array.from({ length: 7 }, (_, i) => outcome(i + 1));
    const html = renderView(progress({ flaggedOutcomes: many }));
    expect(html).toContain("Aprendizagem 5");
    expect(html).not.toContain("Aprendizagem 6");
    expect(html).toContain("showMore");
  });

  it("shows the next assessment, or the empty line when none is scheduled", () => {
    expect(renderView(progress())).toContain("Teste 1");
    const none = renderView(progress({ nextAssessment: null }));
    expect(none).toContain("noAssessment");
    expect(none).not.toContain("Teste 1");
  });
});
