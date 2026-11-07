import { describe, expect, it } from "vitest";
import { endOfDayIso, formatRedemptions, isoToDateInput, parseOptionalPositiveInt } from "./promo-form";

describe("promo form helpers", () => {
  it("shows redemptions alone, or against the cap", () => {
    expect(formatRedemptions({ redemptions: 3, maxRedemptions: null })).toBe("3");
    expect(formatRedemptions({ redemptions: 0, maxRedemptions: 50 })).toBe("0/50");
  });

  it("parses optional positive integers", () => {
    expect(parseOptionalPositiveInt("")).toBeNull();
    expect(parseOptionalPositiveInt(" 30 ")).toBe(30);
    expect(parseOptionalPositiveInt("0")).toBeUndefined();
    expect(parseOptionalPositiveInt("1.5")).toBeUndefined();
    expect(parseOptionalPositiveInt("-2")).toBeUndefined();
  });

  it("round-trips a date input through the end of that local day", () => {
    const iso = endOfDayIso("2026-12-31");
    expect(iso).not.toBeNull();
    expect(isoToDateInput(iso)).toBe("2026-12-31");
    expect(endOfDayIso("")).toBeNull();
    expect(isoToDateInput(null)).toBe("");
  });
});
