import { describe, expect, it } from "vitest";
import { PROGRESS_STEPS, progressStep } from "./GenerationProgress";

describe("progressStep", () => {
  it("starts on the first phrase", () => {
    expect(progressStep(0)).toBe(0);
  });

  it("moves on with time", () => {
    expect(progressStep(4600)).toBe(1);
  });

  it("jumps to the writing steps once text streams", () => {
    expect(progressStep(0, 10)).toBe(2);
  });

  it("never passes the last phrase", () => {
    expect(progressStep(10 * 60_000, 1_000_000)).toBe(PROGRESS_STEPS.length - 1);
  });
});
