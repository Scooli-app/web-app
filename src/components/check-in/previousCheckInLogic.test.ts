import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api/check-in.service", () => ({ checkInService: { submit: vi.fn() } }));
vi.mock("@/services/api/timetable.service", () => ({ getPreviousCheckIn: vi.fn() }));

import type { PreviousLessonCheckIn } from "@/services/api/timetable.service";
import {
  answerPreviousLesson,
  feedsNextLesson,
  loadPreviousCheckIn,
  needsPreviousOutcomeStep,
  phaseAfterSave,
  previousCheckInVisible,
  previousSubmission,
} from "./previousCheckInLogic";

const pending: PreviousLessonCheckIn = {
  slotId: "slot-9",
  date: "2026-10-16",
  topicTitle: "Frações",
  slotType: "LESSON",
  outcomes: [{ id: "o1", text: "Comparar frações", topicPath: ["Números"], source: "ai" }],
};

const shown = { enabled: true, pending, hidden: false, dialogSlotCheckable: false };

describe("previousCheckInVisible", () => {
  it("shows the prompt with the flag on, a previous lesson to ask about, no 'Agora não', and a dialog slot that is not checkable", () => {
    expect(previousCheckInVisible(shown)).toBe(true);
  });

  it("stays hidden with the flag off, when there is nothing to ask, or once dismissed", () => {
    expect(previousCheckInVisible({ ...shown, enabled: false })).toBe(false);
    expect(previousCheckInVisible({ ...shown, pending: null })).toBe(false);
    expect(previousCheckInVisible({ ...shown, hidden: true })).toBe(false);
  });

  it("stays hidden when the dialog's own slot is a past, checkable lesson (it has its own question)", () => {
    expect(previousCheckInVisible({ ...shown, dialogSlotCheckable: true })).toBe(false);
  });
});

describe("phaseAfterSave", () => {
  it("collapses to the short confirmation after a successful save", () => {
    expect(phaseAfterSave(true, "TAUGHT")).toBe("saved");
    expect(phaseAfterSave(true, "NOT_HELD")).toBe("saved");
  });

  it("says the next lesson will take a difficulties or partial answer into account", () => {
    expect(phaseAfterSave(true, "TAUGHT_WITH_DIFFICULTIES")).toBe("savedWithContext");
    expect(phaseAfterSave(true, "PARTIAL")).toBe("savedWithContext");
  });

  it("keeps the question when the save failed", () => {
    expect(phaseAfterSave(false, "TAUGHT")).toBeNull();
  });
});

describe("loadPreviousCheckIn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends no request when the flag is off", async () => {
    const load = vi.fn();
    await expect(loadPreviousCheckIn(false, "tt", "lesson", load)).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("returns what the backend says is pending", async () => {
    const load = vi.fn().mockResolvedValue(pending);
    await expect(loadPreviousCheckIn(true, "tt", "lesson", load)).resolves.toEqual(pending);
    expect(load).toHaveBeenCalledWith("tt", "lesson");
  });

  it("treats a failed load as nothing to ask, so generation is never held up", async () => {
    const load = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(loadPreviousCheckIn(true, "tt", "lesson", load)).resolves.toBeNull();
  });
});

describe("answerPreviousLesson", () => {
  it("saves a normal check-in on the previous lesson's slot", async () => {
    const save = vi.fn().mockResolvedValue({ id: "c1" });
    const ok = await answerPreviousLesson("tt", pending, { result: "TAUGHT" }, save);
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalledWith("tt", "slot-9", { result: "TAUGHT" });
  });

  it("reports a failed save so the prompt can say so", async () => {
    const save = vi.fn().mockRejectedValue(new Error("500"));
    await expect(answerPreviousLesson("tt", pending, { result: "NOT_HELD" }, save)).resolves.toBe(false);
  });

  it("uses the real check-in service when no save function is given", async () => {
    const { checkInService } = await import("@/services/api/check-in.service");
    vi.mocked(checkInService.submit).mockResolvedValueOnce({
      id: "c2",
      timetableId: "tt",
      teachingStatus: "taught",
      checkedInAt: "x",
    });
    await expect(answerPreviousLesson("tt", pending, { result: "TAUGHT" })).resolves.toBe(true);
    expect(checkInService.submit).toHaveBeenCalledWith("tt", "slot-9", { result: "TAUGHT" });
  });
});

describe("previousSubmission and the outcome step", () => {
  it("sends outcome ids only for the matching result and only when some were picked", () => {
    expect(previousSubmission("TAUGHT_WITH_DIFFICULTIES", ["o1"])).toEqual({
      result: "TAUGHT_WITH_DIFFICULTIES",
      difficultOutcomeIds: ["o1"],
    });
    expect(previousSubmission("PARTIAL", ["o1"])).toEqual({ result: "PARTIAL", uncoveredOutcomeIds: ["o1"] });
    expect(previousSubmission("PARTIAL")).toEqual({ result: "PARTIAL" });
    expect(previousSubmission("TAUGHT", ["o1"])).toEqual({ result: "TAUGHT" });
  });

  it("asks for outcomes only on difficulties or partial, and only when the lesson has outcomes", () => {
    expect(needsPreviousOutcomeStep("TAUGHT_WITH_DIFFICULTIES", pending)).toBe(true);
    expect(needsPreviousOutcomeStep("PARTIAL", pending)).toBe(true);
    expect(needsPreviousOutcomeStep("TAUGHT", pending)).toBe(false);
    expect(needsPreviousOutcomeStep("NOT_HELD", pending)).toBe(false);
    expect(needsPreviousOutcomeStep("PARTIAL", { ...pending, outcomes: [] })).toBe(false);
  });

  it("marks only difficulties and partial as feeding the next lesson", () => {
    expect(feedsNextLesson("TAUGHT_WITH_DIFFICULTIES")).toBe(true);
    expect(feedsNextLesson("PARTIAL")).toBe(true);
    expect(feedsNextLesson("TAUGHT")).toBe(false);
    expect(feedsNextLesson("NOT_HELD")).toBe(false);
  });
});
