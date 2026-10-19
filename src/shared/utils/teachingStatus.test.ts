import { describe, expect, it } from "vitest";
import { canCheckIn, isCheckableSlot, teachingMark } from "./teachingStatus";

const TODAY = "2026-10-19";

function slot(overrides: Partial<{ slotType: "LESSON" | "HOLIDAY" | "ASSESSMENT"; slotDate: string; status: string; teachingStatus: "planned" | "taught" | "partially_taught" | "not_held" | "assumed_taught" }> = {}) {
  return {
    slotType: "LESSON" as const,
    slotDate: "2026-10-15",
    status: "completed",
    teachingStatus: "planned" as const,
    ...overrides,
  };
}

describe("isCheckableSlot", () => {
  it("accepts a past lesson", () => {
    expect(isCheckableSlot(slot(), TODAY)).toBe(true);
  });

  it("rejects today and future slots", () => {
    expect(isCheckableSlot(slot({ slotDate: TODAY }), TODAY)).toBe(false);
    expect(isCheckableSlot(slot({ slotDate: "2026-10-20" }), TODAY)).toBe(false);
  });

  it("rejects skipped slots", () => {
    expect(isCheckableSlot(slot({ status: "skipped" }), TODAY)).toBe(false);
  });

  it("rejects holidays", () => {
    expect(isCheckableSlot(slot({ slotType: "HOLIDAY" }), TODAY)).toBe(false);
  });

  it("accepts assessments", () => {
    expect(isCheckableSlot(slot({ slotType: "ASSESSMENT" }), TODAY)).toBe(true);
  });
});

describe("canCheckIn", () => {
  it("is off when the class_state_enabled flag is off, even for a past lesson", () => {
    expect(canCheckIn(false, slot(), TODAY)).toBe(false);
  });

  it("is on for a past checkable slot when the flag is on", () => {
    expect(canCheckIn(true, slot(), TODAY)).toBe(true);
  });

  it("is off for today, skipped and holiday slots when the flag is on", () => {
    expect(canCheckIn(true, slot({ slotDate: TODAY }), TODAY)).toBe(false);
    expect(canCheckIn(true, slot({ status: "skipped" }), TODAY)).toBe(false);
    expect(canCheckIn(true, slot({ slotType: "HOLIDAY" }), TODAY)).toBe(false);
  });
});

describe("teachingMark", () => {
  it.each([
    ["taught", { key: "taught", glyph: "✓" }],
    ["partially_taught", { key: "partiallyTaught", glyph: "½" }],
    ["not_held", { key: "notHeld", glyph: "✕" }],
    ["assumed_taught", { key: "assumedTaught", glyph: "✓" }],
    ["planned", { key: "unconfirmed", glyph: "•" }],
  ] as const)("maps %s to its mark", (teachingStatus, expected) => {
    expect(teachingMark(slot({ teachingStatus }), TODAY)).toEqual(expected);
  });

  it("shows the unconfirmed dot for a past planned lesson", () => {
    expect(teachingMark(slot({ teachingStatus: "planned" }), TODAY)?.key).toBe("unconfirmed");
  });

  it("keeps the not-held mark on a skipped slot, but a skipped slot is still not checkable", () => {
    const skippedNotHeld = slot({ status: "skipped", teachingStatus: "not_held" });
    expect(teachingMark(skippedNotHeld, TODAY)).toEqual({ key: "notHeld", glyph: "✕" });
    expect(canCheckIn(true, skippedNotHeld, TODAY)).toBe(false);
  });

  it("has no mark for a skipped slot that is not marked not-held", () => {
    expect(teachingMark(slot({ status: "skipped", teachingStatus: "taught" }), TODAY)).toBeNull();
    expect(teachingMark(slot({ status: "skipped", teachingStatus: "planned" }), TODAY)).toBeNull();
  });

  it("has no mark for future, skipped or holiday slots", () => {
    expect(teachingMark(slot({ slotDate: "2026-10-30", teachingStatus: "taught" }), TODAY)).toBeNull();
    expect(teachingMark(slot({ status: "skipped", teachingStatus: "taught" }), TODAY)).toBeNull();
    expect(teachingMark(slot({ slotType: "HOLIDAY" }), TODAY)).toBeNull();
  });
});
