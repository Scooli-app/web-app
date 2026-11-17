import { describe, expect, it } from "vitest";
import {
  ROLE_ORDER,
  isFirstCycleOnly,
  isTeachingValid,
  skipsClassStep,
} from "@/components/onboarding-v2/teachingRules";

const answer = (over: Partial<Parameters<typeof isTeachingValid>[0]>) => ({
  role: "teacher" as const,
  years: [5],
  subjectIds: ["matematica"],
  courseCount: 0,
  ...over,
});

describe("isTeachingValid (same rules as the server's saveProfile)", () => {
  it("needs years and subjects from a regular teacher", () => {
    expect(isTeachingValid(answer({}))).toBe(true);
    expect(isTeachingValid(answer({ subjectIds: [] }))).toBe(false);
    expect(isTeachingValid(answer({ years: [] }))).toBe(false);
    expect(isTeachingValid(answer({ role: null }))).toBe(false);
  });
  it("needs nothing from a pre-school teacher", () => {
    expect(isTeachingValid(answer({ role: "preschool", years: [], subjectIds: [] }))).toBe(true);
  });
  it("needs years but not subjects in special education", () => {
    expect(isTeachingValid(answer({ role: "special_ed", years: [3], subjectIds: [] }))).toBe(true);
    expect(isTeachingValid(answer({ role: "special_ed", years: [], subjectIds: [] }))).toBe(false);
  });
  it("needs years and a course, but no UC, from a vocational teacher", () => {
    expect(isTeachingValid(answer({ role: "vocational", years: [10], subjectIds: [], courseCount: 1 }))).toBe(true);
    expect(isTeachingValid(answer({ role: "vocational", years: [10], subjectIds: ["matematica"], courseCount: 0 }))).toBe(false);
    expect(isTeachingValid(answer({ role: "vocational", years: [], subjectIds: [], courseCount: 1 }))).toBe(false);
  });
});

describe("skipsClassStep", () => {
  it("skips the class only for pre-school", () => {
    expect(skipsClassStep("preschool")).toBe(true);
    expect(skipsClassStep("teacher")).toBe(false);
    expect(skipsClassStep(null)).toBe(false);
  });
});

describe("isFirstCycleOnly", () => {
  it("is true when every chosen year is 1.º–4.º", () => {
    expect(isFirstCycleOnly([1, 3])).toBe(true);
    expect(isFirstCycleOnly([4, 5])).toBe(false);
    expect(isFirstCycleOnly([])).toBe(false);
  });
});

describe("ROLE_ORDER", () => {
  it("lists the teaching roles first", () => {
    expect(ROLE_ORDER).toEqual([
      "teacher",
      "special_ed",
      "vocational",
      "preschool",
      "coordinator",
      "director",
      "tutor",
      "other",
    ]);
  });
});
