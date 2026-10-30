import { describe, expect, it } from "vitest";
import { canCheckIn, difficultOutcomeTexts, isCheckableSlot, slotCheckInAnswer, teachingMark } from "./teachingStatus";

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

describe("teachingMark: a 'com dificuldades' answer (ENG-246)", () => {
  it("shows an amber ~ for a taught lesson whose answer was TAUGHT_WITH_DIFFICULTIES", () => {
    expect(
      teachingMark({ ...slot({ teachingStatus: "taught" }), checkInResult: "TAUGHT_WITH_DIFFICULTIES" }, TODAY),
    ).toEqual({ key: "taughtWithDifficulties", glyph: "~" });
  });

  it("keeps the plain check mark for a 'correu bem' answer", () => {
    expect(teachingMark({ ...slot({ teachingStatus: "taught" }), checkInResult: "TAUGHT" }, TODAY)).toEqual({
      key: "taught",
      glyph: "✓",
    });
  });

  it("keeps the plain check mark when there is no answer result (older slots)", () => {
    expect(teachingMark({ ...slot({ teachingStatus: "taught" }), checkInResult: null }, TODAY)?.key).toBe("taught");
  });

  it("does not turn a partial answer into the difficulty mark", () => {
    expect(
      teachingMark({ ...slot({ teachingStatus: "partially_taught" }), checkInResult: "PARTIAL" }, TODAY)?.key,
    ).toBe("partiallyTaught");
  });
});

describe("difficultOutcomeTexts", () => {
  const outcomes = [
    { id: "o1", text: "Ler com fluência", topicPath: [], source: "ai" },
    { id: "o2", text: "Somar frações", topicPath: [], source: "ai" },
  ];

  it("returns the texts of the difficult outcomes of a difficulty answer", () => {
    expect(
      difficultOutcomeTexts({ checkInResult: "TAUGHT_WITH_DIFFICULTIES", checkInOutcomeIds: ["o2"], outcomes }),
    ).toEqual(["Somar frações"]);
  });

  it("is empty for any other answer, even with ids", () => {
    expect(difficultOutcomeTexts({ checkInResult: "TAUGHT", checkInOutcomeIds: ["o1"], outcomes })).toEqual([]);
    expect(difficultOutcomeTexts({ checkInResult: null, checkInOutcomeIds: ["o1"], outcomes })).toEqual([]);
  });

  it("leaves out an id the slot no longer lists", () => {
    expect(
      difficultOutcomeTexts({ checkInResult: "TAUGHT_WITH_DIFFICULTIES", checkInOutcomeIds: ["gone"], outcomes }),
    ).toEqual([]);
  });
});

describe("slotCheckInAnswer", () => {
  it("keeps the difficult ids for a difficulty answer", () => {
    expect(
      slotCheckInAnswer({ result: "TAUGHT_WITH_DIFFICULTIES", difficultOutcomeIds: ["o1"], uncoveredOutcomeIds: ["o2"] }),
    ).toEqual({ checkInResult: "TAUGHT_WITH_DIFFICULTIES", checkInOutcomeIds: ["o1"], missingAmount: null, teachingNote: null });
  });

  it("keeps the uncovered ids and the amount for a partial answer", () => {
    expect(slotCheckInAnswer({ result: "PARTIAL", uncoveredOutcomeIds: ["o2"], missingAmount: "MOST" })).toEqual({
      checkInResult: "PARTIAL",
      checkInOutcomeIds: ["o2"],
      missingAmount: "MOST",
      teachingNote: null,
    });
  });

  it("keeps the note, trimmed as sent, and has no ids for the other two answers", () => {
    expect(slotCheckInAnswer({ result: "TAUGHT", difficultOutcomeIds: ["o1"] })).toEqual({
      checkInResult: "TAUGHT",
      checkInOutcomeIds: [],
      missingAmount: null,
      teachingNote: null,
    });
    expect(slotCheckInAnswer({ result: "NOT_HELD", note: "Chuva" }).teachingNote).toBe("Chuva");
    expect(slotCheckInAnswer({ result: "NOT_HELD" }).checkInOutcomeIds).toEqual([]);
  });
});
