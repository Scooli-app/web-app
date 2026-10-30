import { describe, expect, it } from "vitest";
import { patchOpenSlot } from "./patchOpenSlot";

type Row = { id: string; status: "completed" | "failed"; title: string };

const lessonB: Row = { id: "b", status: "completed", title: "B" };

describe("patchOpenSlot", () => {
  it("patches the open lesson when it is the one the stream belongs to", () => {
    expect(patchOpenSlot({ ...lessonB }, "b", { status: "failed" })).toEqual({
      ...lessonB,
      status: "failed",
    });
  });

  it("leaves another open lesson untouched", () => {
    const open = { ...lessonB };
    expect(patchOpenSlot(open, "a", { status: "failed" })).toBe(open);
  });

  it("keeps a closed dialog closed", () => {
    expect(patchOpenSlot<Row>(null, "a", { status: "failed" })).toBeNull();
  });
});
