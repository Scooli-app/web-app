import { describe, expect, it } from "vitest";
import { savedCheckIn } from "./savedCheckIn";

describe("savedCheckIn", () => {
  it("reads a started replan from the record", () => {
    expect(savedCheckIn({ replanStarted: true })).toEqual({ replanStarted: true });
  });

  it("treats a missing flag (older server) or no record as no replan", () => {
    expect(savedCheckIn({})).toEqual({ replanStarted: false });
    expect(savedCheckIn(undefined)).toEqual({ replanStarted: false });
  });
});
