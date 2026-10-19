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
}));
vi.mock("@/store/features/selectors", () => ({
  selectIsClassStateEnabled: () => store.enabled,
}));
vi.mock("@/services/api/timetable.service", () => ({ listLessonDocuments: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/api/check-in.service", () => ({
  checkInService: { submit: vi.fn(), shiftFollowing: vi.fn() },
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
