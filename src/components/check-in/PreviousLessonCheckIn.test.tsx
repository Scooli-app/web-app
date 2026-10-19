import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ enabled: false }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/store/hooks", () => ({
  useAppSelector: (selector: () => boolean) => selector(),
}));
vi.mock("@/store/features/selectors", () => ({
  selectIsClassStateEnabled: () => store.enabled,
}));
vi.mock("@/services/api/check-in.service", () => ({ checkInService: { submit: vi.fn() } }));
vi.mock("@/services/api/timetable.service", () => ({ getPreviousCheckIn: vi.fn() }));

import type { CheckInOutcome } from "@/shared/types/check-in";
import { PreviousLessonCheckIn, PreviousLessonCheckInView } from "./PreviousLessonCheckIn";

const outcomes: CheckInOutcome[] = [
  { id: "o1", text: "Comparar frações", topicPath: ["Números"], source: "ai" },
];

const noop = () => undefined;

function view(overrides: Partial<Parameters<typeof PreviousLessonCheckInView>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PreviousLessonCheckInView, {
      question: "A última aula (Frações) correu bem?",
      saved: null,
      saveFailed: false,
      outcomeResult: null,
      outcomes,
      selected: [],
      onChoose: noop,
      onToggle: noop,
      onConfirm: noop,
      onSkipOutcomes: noop,
      onBackOutcomes: noop,
      onNotNow: noop,
      ...overrides,
    }),
  );
}

describe("PreviousLessonCheckIn (container)", () => {
  beforeEach(() => {
    store.enabled = false;
  });

  it("renders nothing with the class-state flag off", () => {
    expect(renderToStaticMarkup(createElement(PreviousLessonCheckIn, { timetableId: "tt", lessonId: "s", dialogSlot: { slotType: "LESSON", slotDate: "2026-10-22", status: "pending" } }))).toBe("");
  });

  it("renders nothing before a previous lesson has been loaded, even with the flag on", () => {
    store.enabled = true;
    expect(renderToStaticMarkup(createElement(PreviousLessonCheckIn, { timetableId: "tt", lessonId: "s", dialogSlot: { slotType: "LESSON", slotDate: "2026-10-22", status: "pending" } }))).toBe("");
  });
});

describe("PreviousLessonCheckInView", () => {
  it("asks the one-line question with the four results and 'Agora não'", () => {
    const html = view();
    expect(html).toContain("A última aula (Frações) correu bem?");
    expect(html).toContain("resultTaught");
    expect(html).toContain("resultDifficulties");
    expect(html).toContain("resultPartial");
    expect(html).toContain("resultNotHeld");
    expect(html).toContain("notNow");
  });

  it("collapses to the short confirmation once saved, dropping the question and the results", () => {
    const html = view({ saved: "saved" });
    expect(html).toContain('role="status"');
    expect(html).toContain("saved");
    expect(html).not.toContain("resultTaught");
    expect(html).not.toContain("notNow");
  });

  it("says the next lesson takes the answer into account after a difficulties or partial answer", () => {
    expect(view({ saved: "savedWithContext" })).toContain("savedWithContext");
  });

  it("offers the outcome chips for difficulties and for a partial lesson", () => {
    const difficulties = view({ outcomeResult: "TAUGHT_WITH_DIFFICULTIES" });
    expect(difficulties).toContain("difficultiesQuestion");
    expect(difficulties).toContain("Comparar frações");
    expect(difficulties).not.toContain("resultTaught");

    expect(view({ outcomeResult: "PARTIAL" })).toContain("uncoveredQuestion");
  });

  it("keeps the question and says so when the save failed", () => {
    const html = view({ saveFailed: true });
    expect(html).toContain("A última aula (Frações) correu bem?");
    expect(html).toContain("saveError");
    expect(html).not.toContain('role="status"');
  });
});
