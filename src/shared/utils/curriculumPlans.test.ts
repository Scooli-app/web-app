import { describe, expect, it } from "vitest";
import { isReadyPlan } from "./curriculumPlans";

describe("isReadyPlan", () => {
  it("accepts a finished plan", () => {
    expect(isReadyPlan({ status: "completed" })).toBe(true);
  });

  it("leaves out a plan that failed or is still being made", () => {
    expect(isReadyPlan({ status: "failed" })).toBe(false);
    expect(isReadyPlan({ status: "generating" })).toBe(false);
    expect(isReadyPlan({ status: "pending" })).toBe(false);
  });
});
