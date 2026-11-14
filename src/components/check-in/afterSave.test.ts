import { describe, expect, it } from "vitest";
import type { PendingCheckIn } from "@/shared/types/check-in";
import type { ReplanProposal } from "@/shared/types/replan";
import { afterSaveFor, withReplanOutcome } from "./afterSave";

const item = { timetableId: "tt", slotId: "s1", slotDate: "2026-11-10", slotType: "LESSON" } as PendingCheckIn;
const proposal = (status: ReplanProposal["status"]): ReplanProposal => ({
  id: "p1",
  status,
  trigger: "not_held",
  triggerSlotId: "s1",
  summary: null,
  createdAt: null,
  items: [],
});

describe("afterSaveFor", () => {
  it("not held with a replan running: waits for it, no move offer", () => {
    const panel = afterSaveFor(item, { result: "NOT_HELD" }, { replanStarted: true });
    expect(panel.replan).toBe("generating");
    expect(panel.shiftAsk).toBe(false);
    expect(panel.adjustAsk).toBe(false);
  });

  it("not held without a replan (no Pro): offers to move the following lessons", () => {
    const panel = afterSaveFor(item, { result: "NOT_HELD" }, { replanStarted: false });
    expect(panel.shiftAsk).toBe(true);
  });

  it("partial with outcomes: offers the AI proposal and the carry-over", () => {
    const panel = afterSaveFor(item, { result: "PARTIAL", uncoveredOutcomeIds: ["o1"] }, { replanStarted: false });
    expect(panel.adjustAsk).toBe(true);
    expect(panel.followUp).toEqual({ kind: "carryOver", outcomeIds: ["o1"] });
  });
});

describe("withReplanOutcome", () => {
  it("a ready proposal offers the review", () => {
    const panel = withReplanOutcome(afterSaveFor(item, { result: "NOT_HELD" }, { replanStarted: true }), proposal("pending"));
    expect(panel.replan).toBe("ready");
  });

  it("a failed replan after 'não houve aula' falls back to moving the lessons", () => {
    const panel = withReplanOutcome(afterSaveFor(item, { result: "NOT_HELD" }, { replanStarted: true }), proposal("failed"));
    expect(panel.replan).toBe("failed");
    expect(panel.shiftAsk).toBe(true);
  });
});
