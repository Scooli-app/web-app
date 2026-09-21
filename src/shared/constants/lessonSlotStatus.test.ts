import { describe, expect, it } from "vitest";
import { getLessonSlotStatusTranslationKey } from "./lessonSlotStatusLabel";

describe("getLessonSlotStatusTranslationKey", () => {
  it("preserves the existing labels while Class State is disabled", () => {
    expect(getLessonSlotStatusTranslationKey("pending", false)).toBe("status.pending");
    expect(getLessonSlotStatusTranslationKey("completed", false)).toBe("status.completed");
  });

  it("uses explicit generation labels while Class State is enabled", () => {
    expect(getLessonSlotStatusTranslationKey("pending", true)).toBe(
      "generationStatus.pending",
    );
    expect(getLessonSlotStatusTranslationKey("completed", true)).toBe(
      "generationStatus.completed",
    );
  });
});
