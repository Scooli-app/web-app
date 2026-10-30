// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/store/entitlements/selectors", () => ({
  selectHasEffectivePro: () => false,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/services/api/check-in.service", () => ({
  checkInService: { submit: vi.fn(), shiftFollowing: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));
vi.mock("@/services/api/timetable.service", () => ({ getPreviousCheckIn: vi.fn() }));

import { checkInService } from "@/services/api/check-in.service";
import { getPreviousCheckIn, type PreviousLessonCheckIn as PreviousCheckIn } from "@/services/api/timetable.service";
import type { CheckInOutcome } from "@/shared/types/check-in";
import { PreviousLessonCheckIn, PreviousLessonCheckInView } from "./PreviousLessonCheckIn";

const outcomes: CheckInOutcome[] = [
  { id: "o1", text: "Comparar frações", topicPath: ["Números"], source: "ai" },
];

const noop = () => undefined;

function view(overrides: Partial<Parameters<typeof PreviousLessonCheckInView>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PreviousLessonCheckInView, {
      question: "Como correu a aula (Frações)?",
      saved: null,
      saveFailed: false,
      outcomeResult: null,
      outcomes,
      selected: [],
      onChoose: noop,
      onToggle: noop,
      onConfirm: noop,
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

describe("PreviousLessonCheckIn (saving)", () => {
  const previous: PreviousCheckIn = {
    slotId: "slot-9",
    date: "2026-10-16",
    topicTitle: "Frações",
    slotType: "LESSON",
    outcomes: [],
  };
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    store.enabled = true;
    vi.mocked(getPreviousCheckIn).mockResolvedValue(previous);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function mountWith(onCheckedIn: () => void, onShifted?: () => void) {
    // A future dialog slot, so the prompt is shown (a past checkable slot has its own question).
    const dialogSlot = { slotType: "LESSON" as const, slotDate: "2999-01-01", status: "pending" };
    await act(async () => {
      root.render(
        createElement(PreviousLessonCheckIn, { timetableId: "tt", lessonId: "s", dialogSlot, onCheckedIn, onShifted }),
      );
    });
  }

  function clickResult(label: string) {
    const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(label));
    if (!button) throw new Error(`no button ${label}`);
    return act(async () => {
      button.click();
    });
  }

  it("calls onCheckedIn once the previous lesson's answer is saved", async () => {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "taught",
      checkedInAt: "2026-10-19T09:00:00Z",
    });
    const onCheckedIn = vi.fn();
    await mountWith(onCheckedIn);
    await clickResult("resultTaught");

    expect(checkInService.submit).toHaveBeenCalledWith("tt", "slot-9", { result: "TAUGHT" });
    expect(onCheckedIn).toHaveBeenCalledTimes(1);
  });

  it("offers to move the following lessons after 'not held', and moves them on 'Mover'", async () => {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "not_held",
      checkedInAt: "2026-10-19T09:00:00Z",
    });
    vi.mocked(checkInService.shiftFollowing).mockResolvedValue({ shifted: 2, overflow: [] });
    const onShifted = vi.fn();
    await mountWith(vi.fn(), onShifted);
    await clickResult("resultNotHeld");

    expect(container.textContent).toContain("shiftQuestion");
    await clickResult("shiftAction");

    expect(checkInService.shiftFollowing).toHaveBeenCalledWith("tt", "slot-9");
    expect(onShifted).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("shiftQuestion");
  });

  it("does not offer to move anything after the previous lesson went well", async () => {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "taught",
      checkedInAt: "2026-10-19T09:00:00Z",
    });
    await mountWith(vi.fn());
    await clickResult("resultTaught");

    expect(container.textContent).not.toContain("shiftQuestion");
  });

  it("does not call onCheckedIn when the save fails", async () => {
    vi.mocked(checkInService.submit).mockRejectedValue(new Error("500"));
    const onCheckedIn = vi.fn();
    await mountWith(onCheckedIn);
    await clickResult("resultTaught");

    expect(onCheckedIn).not.toHaveBeenCalled();
    expect(container.textContent).toContain("saveError");
  });
});

describe("PreviousLessonCheckInView", () => {
  it("asks the one-line question with the four results and 'Agora não'", () => {
    const html = view();
    expect(html).toContain("Como correu a aula (Frações)?");
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

  it("keeps the lesson's header line above the outcome question", () => {
    const partial = view({ outcomeResult: "PARTIAL" });
    expect(partial).toContain("Como correu a aula (Frações)?");
    expect(partial.indexOf("A última aula (Frações)")).toBeLessThan(partial.indexOf("uncoveredQuestion"));
  });

  it("keeps the question and says so when the save failed", () => {
    const html = view({ saveFailed: true });
    expect(html).toContain("Como correu a aula (Frações)?");
    expect(html).toContain("saveError");
    expect(html).not.toContain('role="status"');
  });
});
