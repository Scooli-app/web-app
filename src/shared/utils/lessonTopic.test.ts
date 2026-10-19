import { describe, expect, it } from "vitest";
import { isVisibleSlot, isListableSlot } from "./lessonTopic";

describe("isVisibleSlot", () => {
  it("draws a titled lesson, as before", () => {
    expect(isVisibleSlot({ slotType: "LESSON", topicTitle: "Frações", teachingStatus: "taught" })).toBe(true);
  });

  it("draws a not-held lesson even when its title is blank", () => {
    expect(isVisibleSlot({ slotType: "LESSON", topicTitle: null, teachingStatus: "not_held" })).toBe(true);
    expect(isVisibleSlot({ slotType: "LESSON", topicTitle: "  ", teachingStatus: "not_held" })).toBe(true);
  });

  it("still hides a blank lesson that is not not-held", () => {
    expect(isVisibleSlot({ slotType: "LESSON", topicTitle: "", teachingStatus: "unconfirmed" })).toBe(false);
    expect(isVisibleSlot({ slotType: "LESSON", topicTitle: null })).toBe(false);
  });

  it("leaves isListableSlot unchanged for the other views", () => {
    const notHeld = { slotType: "LESSON", topicTitle: null, teachingStatus: "not_held" };
    expect(isListableSlot(notHeld)).toBe(false);
  });
});
