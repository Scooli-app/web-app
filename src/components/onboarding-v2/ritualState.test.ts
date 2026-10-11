import { describe, expect, it } from "vitest";
import {
  buildCompletePayload,
  type RitualState,
} from "@/components/onboarding-v2/ritualState";

const state = (over: Partial<RitualState> = {}): RitualState => ({
  planningDay: 7,
  weeklyEmail: true,
  goals: [],
  source: null,
  sourceOther: "",
  ...over,
});

describe("buildCompletePayload (F2)", () => {
  it("sends goals: [] when the teacher removed every goal", () => {
    const payload = buildCompletePayload(state({ goals: [] }), false);
    expect(payload.goals).toEqual([]);
  });

  it("sends the current goals and source explicitly", () => {
    const payload = buildCompletePayload(
      state({ goals: ["CURIOSITY"], source: "OTHER", sourceOther: "  a friend " }),
      true,
    );
    expect(payload).toMatchObject({
      goals: ["CURIOSITY"],
      acquisitionSource: "OTHER",
      acquisitionSourceOther: "a friend",
      skippedClass: true,
    });
  });

  it("sends null for source only when it was never chosen, and drops stale other text", () => {
    expect(buildCompletePayload(state(), false)).toMatchObject({
      acquisitionSource: null,
      acquisitionSourceOther: null,
    });
    expect(
      buildCompletePayload(state({ source: "FACEBOOK", sourceOther: "left over" }), false),
    ).toMatchObject({ acquisitionSource: "FACEBOOK", acquisitionSourceOther: null });
  });

  it("always sends planning day and weeklyEmail", () => {
    expect(buildCompletePayload(state({ planningDay: 3, weeklyEmail: false }), false)).toMatchObject({
      planningDay: 3,
      weeklyEmail: false,
    });
  });
});
