import { describe, expect, it } from "vitest";
import { describeShift } from "./useShiftFollowing";

describe("describeShift", () => {
  it("reports the moved count and the topics that fell off", () => {
    expect(describeShift({ shifted: 3, overflow: ["Geometria"] })).toEqual({ count: 3, overflow: ["Geometria"] });
  });

  it("drops blank overflow entries so nothing empty is announced", () => {
    expect(describeShift({ shifted: 0, overflow: ["  ", ""] })).toEqual({ count: 0, overflow: [] });
  });
});
