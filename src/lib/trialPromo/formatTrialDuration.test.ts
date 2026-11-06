import { describe, expect, it } from "vitest";
import { trialDuration } from "./formatTrialDuration";

describe("trialDuration", () => {
  it.each([
    [60, { unit: "months", count: 2 }],
    [30, { unit: "months", count: 1 }],
    [90, { unit: "months", count: 3 }],
    [45, { unit: "days", count: 45 }],
    [14, { unit: "days", count: 14 }],
    [1, { unit: "days", count: 1 }],
    [61, { unit: "days", count: 61 }],
  ])("%s days", (days, expected) => {
    expect(trialDuration(days)).toEqual(expected);
  });

  it.each([0, -30, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "60", null, undefined])("rejects %s", (value) => {
    expect(trialDuration(value)).toBeNull();
  });
});
