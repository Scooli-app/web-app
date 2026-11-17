import { describe, expect, it } from "vitest";
import type { ReplanProposal } from "@/shared/types/replan";
import { stepAfterReplan, stepAfterSave } from "./nextStep";

const noReplan = { replanStarted: false, carriedTo: null };
const proposal = (status: ReplanProposal["status"], trigger = "not_held"): ReplanProposal => ({
  id: "p1",
  status,
  trigger,
  triggerSlotId: "s1",
  summary: null,
  createdAt: null,
  items: [],
});

describe("stepAfterSave", () => {
  it("Pro: any answer that started a replan only waits for it", () => {
    expect(stepAfterSave({ result: "PARTIAL" }, { replanStarted: true, carriedTo: null })).toEqual({ kind: "replanning" });
  });

  it("without a replan: 'não houve aula' asks to move the following lessons", () => {
    expect(stepAfterSave({ result: "NOT_HELD" }, noReplan)).toEqual({ kind: "shift" });
  });

  it("without a replan: difficulties with outcomes ask for the reinforcement sheet", () => {
    expect(stepAfterSave({ result: "TAUGHT_WITH_DIFFICULTIES", difficultOutcomeIds: ["o1"] }, noReplan)).toEqual({
      kind: "reinforce",
      outcomeIds: ["o1"],
    });
  });

  it("asks nothing after a lesson that went well, a partial one (carried over by itself) or a test", () => {
    expect(stepAfterSave({ result: "TAUGHT" }, noReplan)).toBeNull();
    expect(stepAfterSave({ result: "PARTIAL", uncoveredOutcomeIds: ["o1"] }, { replanStarted: false, carriedTo: "2026-11-13" })).toBeNull();
    expect(stepAfterSave({ result: "NOT_HELD" }, noReplan, "ASSESSMENT")).toBeNull();
  });
});

describe("stepAfterReplan", () => {
  it("a ready proposal asks to apply or reject it", () => {
    expect(stepAfterReplan(proposal("pending")).kind).toBe("replanReady");
  });

  it("a failure after 'não houve aula' falls back to moving the lessons; otherwise it says so", () => {
    expect(stepAfterReplan(proposal("failed"))).toEqual({ kind: "shift" });
    expect(stepAfterReplan(proposal("failed", "partial"))).toEqual({ kind: "replanFailed" });
    expect(stepAfterReplan(proposal("no_change"))).toEqual({ kind: "replanNoChange" });
  });
});
