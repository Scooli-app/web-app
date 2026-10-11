import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  persistStepTwoSelection,
  readStepTwoSelection,
} from "@/components/onboarding-v2/onboardingStorage";

function installStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  });
  return data;
}

describe("step 2 selection storage (F10)", () => {
  beforeEach(() => void installStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("writes an emptied selection so a refresh does not restore the old one", () => {
    persistStepTwoSelection("u1", { years: [5], subjectIds: ["math"] }, { profileDone: false, edited: true });
    persistStepTwoSelection("u1", { years: [], subjectIds: [] }, { profileDone: false, edited: true });
    expect(readStepTwoSelection("u1")).toEqual({ years: [], subjectIds: [] });
  });

  it("does not write before the teacher edited anything", () => {
    persistStepTwoSelection("u1", { years: [], subjectIds: [] }, { profileDone: false, edited: false });
    expect(readStepTwoSelection("u1")).toBeNull();
  });

  it("does not write once the profile is saved", () => {
    persistStepTwoSelection("u1", { years: [5], subjectIds: ["math"] }, { profileDone: true, edited: true });
    expect(readStepTwoSelection("u1")).toBeNull();
  });
});
