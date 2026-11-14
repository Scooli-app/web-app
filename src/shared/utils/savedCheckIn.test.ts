import { describe, expect, it } from "vitest";
import { savedCheckIn } from "./savedCheckIn";

describe("savedCheckIn", () => {
  it("reads a started replan and an automatic carry-over from the record", () => {
    expect(savedCheckIn({ replanStarted: true })).toEqual({ replanStarted: true, carriedTo: null });
    expect(savedCheckIn({ carriedTo: "2026-11-13" })).toEqual({ replanStarted: false, carriedTo: "2026-11-13" });
  });

  it("treats a missing flag (older server) or no record as no replan", () => {
    expect(savedCheckIn({})).toEqual({ replanStarted: false, carriedTo: null });
    expect(savedCheckIn(undefined)).toEqual({ replanStarted: false, carriedTo: null });
  });
});
