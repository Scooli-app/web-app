import { describe, expect, it } from "vitest";
import {
  canGoBackFrom,
  isStepOneComplete,
  resolveStartStep,
  type StartStepInput,
} from "@/components/onboarding-v2/resumeStep";

const base: StartStepInput = {
  mode: "full",
  profileDone: false,
  hasClass: false,
  lastStep: null,
  skippedClass: false,
  step1Complete: false,
};

describe("resolveStartStep truth table", () => {
  it.each([
    // [label, input override, expected]
    ["fresh user", {}, 1],
    ["role picked but school missing (F1b refresh)", { lastStep: 1 }, 1],
    ["step 1 complete, profile not saved", { step1Complete: true }, 2],
    ["step 1 complete, lastStep 1", { step1Complete: true, lastStep: 1 }, 2],
    ["not done but server says lastStep 3", { lastStep: 3, step1Complete: true }, 2],
    ["not done, stale lastStep 5, step 1 incomplete", { lastStep: 5 }, 1],
    ["not done, hasClass (inconsistent) never 3+", { hasClass: true, step1Complete: true }, 2],
    ["not done, skippedClass never 3+", { skippedClass: true, step1Complete: true }, 2],
    ["profile done, no class", { profileDone: true }, 3],
    ["profile done, no class, lastStep 3", { profileDone: true, lastStep: 3 }, 3],
    ["profile done, no class, lastStep 4", { profileDone: true, lastStep: 4 }, 3],
    ["profile done, no class, lastStep 5 (skipped class)", { profileDone: true, lastStep: 5 }, 5],
    ["profile done, no class, skippedClass", { profileDone: true, skippedClass: true }, 5],
    ["profile done, no class, lastStep 6 (skipped class, at the ritual)", { profileDone: true, lastStep: 6 }, 6],
    ["profile done, has class", { profileDone: true, hasClass: true }, 5],
    ["profile done, has class, lastStep 5", { profileDone: true, hasClass: true, lastStep: 5 }, 5],
    ["profile done, has class, lastStep 6", { profileDone: true, hasClass: true, lastStep: 6 }, 6],
    ["profile mode, step 1 incomplete", { mode: "profile" }, 1],
    ["profile mode, step 1 complete", { mode: "profile", step1Complete: true }, 2],
    ["profile mode, profile done is still capped at 2", { mode: "profile", profileDone: true, step1Complete: true }, 2],
  ] as const)("%s", (_label, override, expected) => {
    expect(resolveStartStep({ ...base, ...override } as StartStepInput)).toBe(expected);
  });

  it("never returns step 3+ while the profile is not saved, nor 3+ in profile mode", () => {
    for (const mode of ["full", "profile"] as const)
      for (const profileDone of [false, true])
        for (const hasClass of [false, true])
          for (const lastStep of [null, 1, 2, 3, 4, 5, 6])
            for (const skippedClass of [false, true])
              for (const step1Complete of [false, true]) {
                const step = resolveStartStep({
                  mode,
                  profileDone,
                  hasClass,
                  lastStep,
                  skippedClass,
                  step1Complete,
                });
                if (!profileDone || mode === "profile") expect(step).toBeLessThanOrEqual(2);
                if (!profileDone && !step1Complete) expect(step).toBe(1);
              }
  });
});

describe("isStepOneComplete", () => {
  it("needs a role and either a school name of 2+ chars or noSchool", () => {
    expect(isStepOneComplete({ role: null, schoolName: "Escola", noSchool: false })).toBe(false);
    expect(isStepOneComplete({ role: "teacher", schoolName: "", noSchool: false })).toBe(false);
    expect(isStepOneComplete({ role: "teacher", schoolName: " a ", noSchool: false })).toBe(false);
    expect(isStepOneComplete({ role: "teacher", schoolName: "Escola X", noSchool: false })).toBe(true);
    expect(isStepOneComplete({ role: "teacher", schoolName: "", noSchool: true })).toBe(true);
  });
});

describe("canGoBackFrom", () => {
  it("allows Back from step 3 while no class exists (F1b)", () => {
    expect(canGoBackFrom({ stepIndex: 2, step: 3, classExists: false })).toBe(true);
  });
  it("hides Back on the first screen, once a class exists, and on the week step", () => {
    expect(canGoBackFrom({ stepIndex: 0, step: 1, classExists: false })).toBe(false);
    expect(canGoBackFrom({ stepIndex: 3, step: 4, classExists: true })).toBe(false);
    expect(canGoBackFrom({ stepIndex: 4, step: 5, classExists: true })).toBe(false);
  });
  it("allows Back from the baseline step when the class was skipped", () => {
    expect(canGoBackFrom({ stepIndex: 4, step: 5, classExists: false })).toBe(true);
  });
  it("always allows Back from the ritual step to the baseline step", () => {
    expect(canGoBackFrom({ stepIndex: 5, step: 6, classExists: true })).toBe(true);
    expect(canGoBackFrom({ stepIndex: 5, step: 6, classExists: false })).toBe(true);
  });
  it("allows Back from step 2", () => {
    expect(canGoBackFrom({ stepIndex: 1, step: 2, classExists: false })).toBe(true);
  });
});
