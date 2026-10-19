import { describe, expect, it, vi } from "vitest";
import type { AssessmentScope } from "@/services/api/timetable.service";
import {
  initialSelection,
  loadAssessmentScope,
  testBlocked,
  testRequestOutcomeIds,
  toggleOutcome,
} from "./assessmentScopeLogic";

const scope: AssessmentScope = {
  fromDate: "2026-09-14",
  outcomes: [
    { id: "o1", text: "Ler números até 100", topicPath: ["Números"], lessons: 2 },
    { id: "o2", text: "Comparar frações", topicPath: ["Frações"], lessons: 1 },
    { id: "o3", text: "Resolver problemas", topicPath: ["Problemas"], lessons: 1 },
  ],
};

describe("loadAssessmentScope", () => {
  it("does not fetch at all when the flag is off", async () => {
    const load = vi.fn();
    await expect(loadAssessmentScope(false, "tt", "s", load)).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("loads the scope for the slot when the flag is on", async () => {
    const load = vi.fn().mockResolvedValue(scope);
    await expect(loadAssessmentScope(true, "tt", "s", load)).resolves.toEqual(scope);
    expect(load).toHaveBeenCalledWith("tt", "s");
  });

  it("treats a failed load as no scope to show, so the test is still generated", async () => {
    const load = vi.fn().mockRejectedValue(new Error("400"));
    await expect(loadAssessmentScope(true, "tt", "s", load)).resolves.toBeNull();
  });
});

describe("selection of the outcomes a test assesses", () => {
  it("starts with every outcome of the scope ticked", () => {
    expect(initialSelection(scope)).toEqual(["o1", "o2", "o3"]);
    expect(initialSelection(null)).toEqual([]);
  });

  it("unticks a ticked outcome and ticks it back, keeping the scope's order", () => {
    const unticked = toggleOutcome(["o1", "o2", "o3"], "o2", scope);
    expect(unticked).toEqual(["o1", "o3"]);
    expect(toggleOutcome(unticked, "o2", scope)).toEqual(["o1", "o2", "o3"]);
  });

  it("sends the ticked outcomes with the test request", () => {
    expect(testRequestOutcomeIds(scope, ["o3", "o1"])).toEqual(["o3", "o1"]);
  });

  it("sends nothing extra when there is no scope to choose from (the server uses the whole scope)", () => {
    expect(testRequestOutcomeIds(null, [])).toBeUndefined();
    expect(testRequestOutcomeIds({ fromDate: null, outcomes: [] }, [])).toBeUndefined();
  });

  it("blocks the test when the scope has outcomes but none is ticked", () => {
    expect(testBlocked(scope, [])).toBe(true);
    expect(testBlocked(scope, ["o1"])).toBe(false);
    expect(testBlocked({ fromDate: null, outcomes: [] }, [])).toBe(false);
    expect(testBlocked(null, [])).toBe(false);
  });
});
