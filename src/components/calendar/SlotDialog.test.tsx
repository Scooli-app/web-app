// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SlotWithTimetable } from "@/shared/types/calendar";

const store = vi.hoisted(() => ({ enabled: true }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "pt-PT",
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/store/hooks", () => ({
  useAppSelector: (selector: () => boolean) => selector(),
  useAppDispatch: () => vi.fn(),
}));
vi.mock("@/store/features/selectors", () => ({
  selectIsClassStateEnabled: () => store.enabled,
}));
vi.mock("@/services/api/timetable.service", () => ({ listLessonDocuments: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/api/check-in.service", () => ({
  checkInService: {
    submit: vi.fn(),
    shiftFollowing: vi.fn(),
    requestReinforcement: vi.fn(),
    carryOver: vi.fn(),
  },
}));
vi.mock("@/components/dashboard/usePrepareLessonSet", () => ({
  usePrepareLessonSet: () => ({
    suggested: [],
    label: "",
    preparing: false,
    prepare: vi.fn(),
    inFlight: new Set(),
  }),
}));
vi.mock("@/components/dashboard/LessonDocumentChips", () => ({ LessonDocumentChips: () => null }));
vi.mock("@/components/check-in/PreviousLessonCheckIn", () => ({ PreviousLessonCheckIn: () => null }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));

import { checkInService } from "@/services/api/check-in.service";
import { toast } from "sonner";
import { SlotDialog } from "./SlotDialog";

const slot = {
  id: "slot-3",
  sequenceNumber: 3,
  slotDate: "2020-03-10",
  slotType: "LESSON",
  status: "completed",
  topicTitle: "Frações",
  description: null,
  durationMinutes: 50,
  outcomes: [],
  checkedInAt: null,
  teachingStatus: "unconfirmed",
  timetable: {
    id: "tt",
    title: "9.º A",
    subject: "Mathematics",
    color: "#7F77DD",
    gradeLevel: 9,
    classLabel: "A",
    linkedCurriculumPlan: null,
  },
} as unknown as SlotWithTimetable;

// The slot as the parent holds it once the check-in is saved (the store puts the new status on it).
const checkedAsNotHeld = {
  ...slot,
  checkedInAt: "2020-03-10T10:00:00Z",
  teachingStatus: "not_held",
} as unknown as SlotWithTimetable;

function dialogProps(overrides: Partial<Parameters<typeof SlotDialog>[0]> = {}) {
  return {
    slot,
    isSlotGenerating: false,
    onClose: vi.fn(),
    onGenerate: vi.fn(),
    onRegenerate: vi.fn(),
    onTypeChange: vi.fn(),
    onTitleChange: vi.fn(),
    onCheckedIn: vi.fn(),
    onLessonsShifted: vi.fn(),
    ...overrides,
  };
}

function buttonWith(label: string): HTMLButtonElement | undefined {
  // Radix renders the dialog in a portal on document.body.
  return [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes(label));
}

describe("SlotDialog: asking to move the following lessons after 'not held'", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    store.enabled = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  async function render(props: ReturnType<typeof dialogProps>) {
    await act(async () => {
      root.render(createElement(SlotDialog, props));
    });
  }

  it("asks inline, under the status, after a not-held check-in, instead of a toast", async () => {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "not_held",
      checkedInAt: "2020-03-10T10:00:00Z",
    });
    const props = dialogProps();
    await render(props);

    await act(async () => {
      buttonWith("resultNotHeld")?.click();
    });
    expect(checkInService.submit).toHaveBeenCalledWith("tt", "slot-3", { result: "NOT_HELD" });
    expect(props.onCheckedIn).toHaveBeenCalledTimes(1);

    // The parent puts the new status on the slot; the question then sits under the status line.
    await render(dialogProps({ slot: checkedAsNotHeld }));
    expect(document.body.textContent).toContain("shiftQuestion");
    expect(buttonWith("shiftAction")).toBeDefined();
    expect(buttonWith("shiftKeep")).toBeDefined();
    expect(toast).not.toHaveBeenCalled();
  });

  it("moves the following lessons on 'Mover', then refreshes the turma's slots", async () => {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "not_held",
      checkedInAt: "2020-03-10T10:00:00Z",
    });
    vi.mocked(checkInService.shiftFollowing).mockResolvedValue({ shifted: 2, overflow: [] });
    const props = dialogProps();
    await render(props);
    await act(async () => {
      buttonWith("resultNotHeld")?.click();
    });
    await render(dialogProps({ slot: checkedAsNotHeld, onLessonsShifted: props.onLessonsShifted }));

    await act(async () => {
      buttonWith("shiftAction")?.click();
    });

    expect(checkInService.shiftFollowing).toHaveBeenCalledWith("tt", "slot-3");
    expect(props.onLessonsShifted).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toContain("shiftQuestion");
  });

  it("hides the question on 'Manter' without moving anything", async () => {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "not_held",
      checkedInAt: "2020-03-10T10:00:00Z",
    });
    const props = dialogProps();
    await render(props);
    await act(async () => {
      buttonWith("resultNotHeld")?.click();
    });
    await render(dialogProps({ slot: checkedAsNotHeld, onLessonsShifted: props.onLessonsShifted }));

    await act(async () => {
      buttonWith("shiftKeep")?.click();
    });

    expect(checkInService.shiftFollowing).not.toHaveBeenCalled();
    expect(props.onLessonsShifted).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("shiftQuestion");
  });
});

describe("SlotDialog: offering a reinforcement worksheet or a carry-over after a check-in", () => {
  let container: HTMLDivElement;
  let root: Root;
  const withOutcomes = {
    ...slot,
    outcomes: [{ id: "o1", text: "Ler com fluência", topicPath: [], source: "ai" }],
  } as unknown as SlotWithTimetable;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    store.enabled = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  async function render(props: ReturnType<typeof dialogProps>) {
    await act(async () => {
      root.render(createElement(SlotDialog, props));
    });
  }

  /**
   * Picks a result, then "Guardar" on the outcome step. The slot has one outcome, so it is ticked already ("ticked");
   * "unticked" clears that tick first, to save with nothing picked.
   */
  async function answer(result: string, pick: "ticked" | "unticked") {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "taught",
      checkedInAt: "2020-03-10T10:00:00Z",
    });
    await render(dialogProps({ slot: withOutcomes }));
    await act(async () => {
      buttonWith(result)?.click();
    });
    if (pick === "unticked") {
      await act(async () => {
        document.querySelector<HTMLElement>('[role="checkbox"]')?.click();
      });
    }
    await act(async () => {
      buttonWith("save")?.click();
    });
  }

  it("offers the reinforcement worksheet after \"some had difficulties\" with an outcome picked", async () => {
    await answer("resultDifficulties", "ticked");

    expect(checkInService.submit).toHaveBeenCalledWith("tt", "slot-3", {
      result: "TAUGHT_WITH_DIFFICULTIES",
      difficultOutcomeIds: ["o1"],
    });
    expect(document.body.textContent).toContain("reinforcementQuestion");
    expect(buttonWith("reinforcementAction")).toBeDefined();
    expect(document.body.textContent).not.toContain("carryOverQuestion");
  });

  it("offers the carry-over after \"half done\" with an outcome picked", async () => {
    await answer("resultPartial", "ticked");

    expect(document.body.textContent).toContain("carryOverQuestion");
    expect(buttonWith("carryOverAction")).toBeDefined();
    expect(document.body.textContent).not.toContain("reinforcementQuestion");
  });

  it("saves with nothing ticked and offers nothing", async () => {
    await answer("resultDifficulties", "unticked");

    expect(checkInService.submit).toHaveBeenCalledWith("tt", "slot-3", { result: "TAUGHT_WITH_DIFFICULTIES" });
    expect(document.body.textContent).not.toContain("reinforcementQuestion");
    expect(document.body.textContent).not.toContain("carryOverQuestion");
  });

  it("offers nothing after a plain \"went well\" check-in", async () => {
    vi.mocked(checkInService.submit).mockResolvedValue({
      id: "c1",
      timetableId: "tt",
      teachingStatus: "taught",
      checkedInAt: "2020-03-10T10:00:00Z",
    });
    await render(dialogProps({ slot: withOutcomes }));
    await act(async () => {
      buttonWith("resultTaught")?.click();
    });

    expect(document.body.textContent).not.toContain("reinforcementQuestion");
    expect(document.body.textContent).not.toContain("carryOverQuestion");
  });

  it("asks the reinforcement worksheet for the chosen outcomes on the accept button", async () => {
    vi.mocked(checkInService.requestReinforcement).mockResolvedValue({
      documentId: "d1",
      targetSlotId: "slot-4",
      targetDate: "2020-03-11",
      status: "generating",
    });
    await answer("resultDifficulties", "ticked");
    await act(async () => {
      buttonWith("reinforcementAction")?.click();
    });

    expect(checkInService.requestReinforcement).toHaveBeenCalledWith("tt", "slot-3", ["o1"]);
    expect(document.body.textContent).not.toContain("reinforcementQuestion");
  });

  it("keeps a line in this lesson's dialog that says where the worksheet is, with Abrir", async () => {
    vi.mocked(checkInService.requestReinforcement).mockResolvedValue({
      documentId: "d1",
      targetSlotId: "slot-4",
      targetDate: "2020-03-11",
      status: "generating",
    });
    await answer("resultDifficulties", "ticked");
    await act(async () => {
      buttonWith("reinforcementAction")?.click();
    });

    expect(document.body.textContent).toContain("reinforcementNote");
    expect(buttonWith("followUpOpenLesson")).toBeDefined();
  });


  it("keeps the offer when the request fails", async () => {
    vi.mocked(checkInService.requestReinforcement).mockRejectedValue(new Error("boom"));
    await answer("resultDifficulties", "ticked");
    await act(async () => {
      buttonWith("reinforcementAction")?.click();
    });

    expect(document.body.textContent).toContain("reinforcementQuestion");
  });

  it("hides the offer on \"Agora não\" without calling the API", async () => {
    await answer("resultPartial", "ticked");
    await act(async () => {
      buttonWith("followUpKeep")?.click();
    });

    expect(checkInService.carryOver).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("carryOverQuestion");
  });
});

describe("SlotDialog: the status of a checked-in lesson (ENG-246)", () => {
  let container: HTMLDivElement;
  let root: Root;
  const outcomes = [
    { id: "o1", text: "Ler com fluência", topicPath: [], source: "ai" },
    { id: "o2", text: "Somar frações", topicPath: [], source: "ai" },
  ];
  const checked = (checkInResult: string, checkInOutcomeIds: string[]) =>
    ({
      ...slot,
      checkedInAt: "2020-03-10T10:00:00Z",
      teachingStatus: "taught",
      checkInResult,
      checkInOutcomeIds,
      outcomes,
    }) as unknown as SlotWithTimetable;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    store.enabled = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  async function renderWith(s: SlotWithTimetable) {
    await act(async () => {
      root.render(createElement(SlotDialog, dialogProps({ slot: s })));
    });
  }

  /** The status value next to "Status:", which carries the mark's label and, for difficulties, the tooltip. */
  function statusValue(label: string): HTMLElement | undefined {
    return [...document.body.querySelectorAll<HTMLElement>("span")].find((el) => el.textContent === label);
  }

  it("says 'Lecionada · com dificuldades' in amber, with the difficult outcome texts as the tooltip", async () => {
    await renderWith(checked("TAUGHT_WITH_DIFFICULTIES", ["o2"]));

    const value = statusValue("mark.taughtWithDifficulties");
    expect(value).toBeDefined();
    expect(value?.className).toContain("text-amber-700");
    expect(value?.getAttribute("title")).toBe("Somar frações");
  });

  it("keeps the plain 'Lecionada' status, with no tooltip, after a 'correu bem' answer", async () => {
    await renderWith(checked("TAUGHT", []));

    const value = statusValue("mark.taught");
    expect(value).toBeDefined();
    expect(value?.className).not.toContain("text-amber-700");
    expect(value?.hasAttribute("title")).toBe(false);
  });
});
