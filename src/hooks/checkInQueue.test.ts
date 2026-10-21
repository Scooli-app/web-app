import { describe, expect, it, vi } from "vitest";
import type { PendingCheckIn } from "@/shared/types/check-in";
import {
  afterConfirmAll,
  buildSubmission,
  confirmableCount,
  initialOutcomeSelection,
  isAssessmentCheckIn,
  loadPendingCheckIns,
  needsDetailStep,
  shouldShowCheckInStrip,
  visibleCheckIns,
  withCheckInAt,
  withoutCheckIn,
} from "./checkInQueue";

const outcome = { id: "o1", text: "Frações equivalentes", topicPath: ["Frações"], source: "curriculum" };

function item(slotId: string, overrides: Partial<PendingCheckIn> = {}): PendingCheckIn {
  return {
    timetableId: "tt-1",
    turmaTitle: "5.º B",
    subject: "Matemática",
    gradeLevel: 5,
    slotId,
    slotDate: "2026-10-18",
    slotType: "LESSON",
    sequenceNumber: 1,
    topicTitle: "Frações equivalentes",
    outcomes: [outcome],
    ...overrides,
  };
}

describe("withoutCheckIn / withCheckInAt (optimistic advance and rollback)", () => {
  it("removes the answered item and remembers where it was", () => {
    const list = [item("a"), item("b"), item("c")];
    const { items, index } = withoutCheckIn(list, "b");
    expect(items.map((i) => i.slotId)).toEqual(["a", "c"]);
    expect(index).toBe(1);
  });

  it("puts the item back at its old place on rollback", () => {
    const list = [item("a"), item("b"), item("c")];
    const { items, index } = withoutCheckIn(list, "b");
    expect(withCheckInAt(items, list[1], index).map((i) => i.slotId)).toEqual(["a", "b", "c"]);
  });

  it("does not duplicate an item that is already back", () => {
    const list = [item("a"), item("b")];
    expect(withCheckInAt(list, list[0], 0)).toBe(list);
  });

  it("leaves the list alone for an unknown slot", () => {
    const list = [item("a")];
    expect(withoutCheckIn(list, "zzz")).toEqual({ items: list, index: -1 });
  });
});

describe("buildSubmission (the POST body per result)", () => {
  it("sends the bare result for TAUGHT and NOT_HELD", () => {
    expect(buildSubmission("TAUGHT")).toEqual({ result: "TAUGHT" });
    expect(buildSubmission("NOT_HELD")).toEqual({ result: "NOT_HELD" });
  });

  it("sends difficultOutcomeIds for TAUGHT_WITH_DIFFICULTIES, and nothing extra when nothing is ticked", () => {
    expect(buildSubmission("TAUGHT_WITH_DIFFICULTIES", ["o1", "o2"])).toEqual({
      result: "TAUGHT_WITH_DIFFICULTIES",
      difficultOutcomeIds: ["o1", "o2"],
    });
    expect(buildSubmission("TAUGHT_WITH_DIFFICULTIES", [])).toEqual({ result: "TAUGHT_WITH_DIFFICULTIES" });
  });

  it("sends uncoveredOutcomeIds for PARTIAL", () => {
    expect(buildSubmission("PARTIAL", ["o3"])).toEqual({ result: "PARTIAL", uncoveredOutcomeIds: ["o3"] });
    expect(buildSubmission("PARTIAL")).toEqual({ result: "PARTIAL" });
  });

  it("does not alias the caller's selection array", () => {
    const selected = ["o1"];
    const body = buildSubmission("PARTIAL", selected);
    selected.push("o2");
    expect(body).toEqual({ result: "PARTIAL", uncoveredOutcomeIds: ["o1"] });
  });
});

describe("buildSubmission with the amount and the note (ENG-253)", () => {
  it("sends the amount only with PARTIAL", () => {
    expect(buildSubmission("PARTIAL", ["o3"], { missingAmount: "HALF" })).toEqual({
      result: "PARTIAL",
      uncoveredOutcomeIds: ["o3"],
      missingAmount: "HALF",
    });
    expect(buildSubmission("TAUGHT_WITH_DIFFICULTIES", ["o1"], { missingAmount: "HALF" })).toEqual({
      result: "TAUGHT_WITH_DIFFICULTIES",
      difficultOutcomeIds: ["o1"],
    });
  });

  it("leaves the amount out when none is picked", () => {
    expect(buildSubmission("PARTIAL", [], { missingAmount: undefined })).toEqual({ result: "PARTIAL" });
  });

  it("trims the note and sends it", () => {
    expect(buildSubmission("TAUGHT_WITH_DIFFICULTIES", [], { note: "  faltou a parte das cadeias  " })).toEqual({
      result: "TAUGHT_WITH_DIFFICULTIES",
      note: "faltou a parte das cadeias",
    });
  });

  it("omits the note when it is blank once trimmed", () => {
    expect(buildSubmission("PARTIAL", [], { note: "   " })).toEqual({ result: "PARTIAL" });
    expect(buildSubmission("PARTIAL", [], { note: "" })).not.toHaveProperty("note");
  });

  it("never sends a note with TAUGHT", () => {
    expect(buildSubmission("TAUGHT", [], { note: "algo" })).toEqual({ result: "TAUGHT" });
  });

  it("keeps a single outcome: it is ticked by default, so its id is still sent", () => {
    const only = [{ id: "o9", text: "Somar frações", topicPath: [], source: "ai" }];
    expect(buildSubmission("PARTIAL", initialOutcomeSelection(only), { missingAmount: "MOST" })).toEqual({
      result: "PARTIAL",
      uncoveredOutcomeIds: ["o9"],
      missingAmount: "MOST",
    });
  });
});

describe("outcome step", () => {
  const outcome = (id: string) => ({ id, text: `texto ${id}`, topicPath: [], source: "ai" });

  it("ticks a single outcome when the step opens", () => {
    expect(initialOutcomeSelection([outcome("o1")])).toEqual(["o1"]);
  });

  it("starts with nothing ticked when there are several outcomes, or none", () => {
    expect(initialOutcomeSelection([outcome("o1"), outcome("o2")])).toEqual([]);
    expect(initialOutcomeSelection([])).toEqual([]);
  });

  it("saves with nothing ticked as the bare result, so the teacher has no skip to press", () => {
    expect(buildSubmission("PARTIAL", [])).toEqual({ result: "PARTIAL" });
    expect(buildSubmission("TAUGHT_WITH_DIFFICULTIES", [])).toEqual({ result: "TAUGHT_WITH_DIFFICULTIES" });
  });
});

describe("detail step", () => {
  it("opens for difficulties and partial, even when the slot has no outcomes (note and amount still asked)", () => {
    expect(needsDetailStep("TAUGHT_WITH_DIFFICULTIES")).toBe(true);
    expect(needsDetailStep("PARTIAL")).toBe(true);
    expect(needsDetailStep("TAUGHT")).toBe(false);
    expect(needsDetailStep("NOT_HELD")).toBe(false);
  });

  it("submits a zero-outcome answer with the note and amount and no outcome ids", () => {
    expect(buildSubmission("PARTIAL", initialOutcomeSelection([]), { missingAmount: "LITTLE", note: "Chuva" })).toEqual({
      result: "PARTIAL",
      missingAmount: "LITTLE",
      note: "Chuva",
    });
    expect(buildSubmission("TAUGHT_WITH_DIFFICULTIES", [], { note: "Chuva" })).toEqual({
      result: "TAUGHT_WITH_DIFFICULTIES",
      note: "Chuva",
    });
  });
});

describe("assessment variant", () => {
  it("applies to ASSESSMENT slots only", () => {
    expect(isAssessmentCheckIn(item("a", { slotType: "ASSESSMENT" }))).toBe(true);
    expect(isAssessmentCheckIn(item("a", { slotType: "EXERCISE" }))).toBe(false);
  });
});

describe("Correram todas bem", () => {
  const queue = [item("l1"), item("t1", { slotType: "ASSESSMENT" }), item("r1", { slotType: "REVIEW" })];

  it("counts only the items it would confirm, leaving tests out", () => {
    expect(confirmableCount(queue)).toBe(2);
  });

  it("keeps tests in the queue after confirming the lessons", () => {
    expect(afterConfirmAll(queue).map((i) => i.slotId)).toEqual(["t1"]);
  });
});

describe("loading and visibility", () => {
  it("sends no request when the flag is off", async () => {
    const load = vi.fn().mockResolvedValue([item("a")]);
    await expect(loadPendingCheckIns(false, load)).resolves.toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });

  it("loads up to 20 pending check-ins when the flag is on", async () => {
    const load = vi.fn().mockResolvedValue([item("a")]);
    await expect(loadPendingCheckIns(true, load)).resolves.toHaveLength(1);
    expect(load).toHaveBeenCalledWith(20);
  });

  it("drops items set aside for this session", () => {
    const list = [item("a"), item("b")];
    expect(visibleCheckIns(list, ["a"]).map((i) => i.slotId)).toEqual(["b"]);
  });

  it("hides the strip when the flag is off, dismissed, or nothing is pending", () => {
    expect(shouldShowCheckInStrip({ enabled: true, dismissed: false, visibleCount: 0 })).toBe(false);
    expect(shouldShowCheckInStrip({ enabled: true, dismissed: true, visibleCount: 2 })).toBe(false);
    expect(shouldShowCheckInStrip({ enabled: false, dismissed: false, visibleCount: 2 })).toBe(false);
    expect(shouldShowCheckInStrip({ enabled: true, dismissed: false, visibleCount: 1 })).toBe(true);
  });
});
