import { describe, expect, it } from "vitest";
import type { Suggestion } from "@/shared/types/suggestions";
import {
  actionFor,
  formatStepDay,
  lessonOf,
  NEXT_STEPS_LIMIT,
  shouldLoadNextSteps,
  visibleSteps,
  weekStartOf,
} from "./nextSteps";

function step(overrides: Partial<Suggestion>): Suggestion {
  return {
    kind: "prepare_next",
    timetableId: "t1",
    turmaTitle: "7.º A",
    slotId: "s1",
    slotDate: "2026-10-20",
    topicTitle: null,
    outcomeIds: [],
    outcomeTexts: [],
    count: null,
    ...overrides,
  };
}

describe("actionFor", () => {
  it.each([
    ["prepare_next", "prepare"],
    ["replan_not_held", "reschedule"],
    ["reinforce", "reinforce"],
    ["check_in", "view"],
  ])("maps %s to %s", (kind, action) => {
    expect(actionFor(kind)).toBe(action);
  });

  it("returns null for a kind this build does not know", () => {
    expect(actionFor("something_new")).toBeNull();
    expect(actionFor("constructor")).toBeNull();
  });
});

describe("visibleSteps", () => {
  it("keeps the backend order and cuts to three", () => {
    const items = [1, 2, 3, 4].map((n) => step({ slotId: `s${n}` }));

    const shown = visibleSteps(items);

    expect(shown.map((s) => s.slotId)).toEqual(["s1", "s2", "s3"]);
    expect(shown).toHaveLength(NEXT_STEPS_LIMIT);
  });

  it("leaves out unknown kinds", () => {
    const shown = visibleSteps([step({ kind: "mystery" as Suggestion["kind"] }), step({ slotId: "s2" })]);

    expect(shown.map((s) => s.slotId)).toEqual(["s2"]);
  });

  it("is empty for an empty list", () => {
    expect(visibleSteps([])).toEqual([]);
  });
});

describe("shouldLoadNextSteps", () => {
  it("does not call the endpoint with the flag off", () => {
    expect(shouldLoadNextSteps(false)).toBe(false);
    expect(shouldLoadNextSteps(true)).toBe(true);
  });
});

describe("lessonOf", () => {
  it("returns the turma and the lesson of a step", () => {
    expect(lessonOf(step({}))).toEqual({ timetableId: "t1", slotId: "s1" });
  });

  it("returns null when the step has no lesson (check-in)", () => {
    expect(lessonOf(step({ kind: "check_in", timetableId: null, slotId: null, count: 2 }))).toBeNull();
    expect(lessonOf(step({ slotId: null }))).toBeNull();
  });
});

describe("weekStartOf", () => {
  it("returns the Monday of the week that holds the date", () => {
    // 2026-10-19 is a Monday; 2026-10-21 is a Wednesday of the same week; a Sunday belongs to the week before.
    expect(weekStartOf("2026-10-21")).toBe("2026-10-19");
    expect(weekStartOf("2026-10-19")).toBe("2026-10-19");
    expect(weekStartOf("2026-10-25")).toBe("2026-10-19");
  });
});

describe("formatStepDay", () => {
  it("names the weekday and the month in the locale", () => {
    expect(formatStepDay("2026-10-20", "pt-PT")).toContain("outubro");
    expect(formatStepDay("2026-10-20", "en-GB")).toContain("October");
  });
});
