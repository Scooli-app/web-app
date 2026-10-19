import { Routes } from "@/shared/types/routes";
import { describe, expect, it } from "vitest";
import { followUpFor, formatLessonDay, lessonCalendarHref, reinforcementTarget } from "./useCheckInFollowUps";

describe("reinforcementTarget and lessonCalendarHref", () => {
  it("opens the lesson's week, on the Monday that holds it", () => {
    // 2020-03-11 is a Wednesday, so its week starts on Monday 2020-03-09.
    expect(reinforcementTarget("tt", "s4", "2020-03-11")).toEqual({
      timetableId: "tt",
      lessonId: "s4",
      weekStart: "2020-03-09",
    });
  });

  it("links to the turma's calendar with that week and lesson, which the calendar page opens", () => {
    const href = lessonCalendarHref({ timetableId: "tt", lessonId: "s4", weekStart: "2020-03-09" });
    expect(href).toBe(`${Routes.CALENDAR}/tt?week=2020-03-09&lesson=s4`);
  });
});

describe("followUpFor", () => {
  it("offers a reinforcement worksheet for the outcomes of 'some had difficulties'", () => {
    expect(followUpFor({ result: "TAUGHT_WITH_DIFFICULTIES", difficultOutcomeIds: ["o1"] })).toEqual({
      kind: "reinforcement",
      outcomeIds: ["o1"],
    });
  });

  it("offers the carry-over for the outcomes of 'half done'", () => {
    expect(followUpFor({ result: "PARTIAL", uncoveredOutcomeIds: ["o2", "o3"] })).toEqual({
      kind: "carryOver",
      outcomeIds: ["o2", "o3"],
    });
  });

  it("offers nothing without outcomes picked", () => {
    expect(followUpFor({ result: "TAUGHT_WITH_DIFFICULTIES" })).toBeNull();
    expect(followUpFor({ result: "PARTIAL", uncoveredOutcomeIds: [] })).toBeNull();
  });

  it("offers nothing for the other results, even with outcomes", () => {
    expect(followUpFor({ result: "TAUGHT", difficultOutcomeIds: ["o1"] })).toBeNull();
    expect(followUpFor({ result: "NOT_HELD", uncoveredOutcomeIds: ["o1"] })).toBeNull();
  });

  it("ignores the outcome list of the other result", () => {
    expect(followUpFor({ result: "PARTIAL", difficultOutcomeIds: ["o1"] })).toBeNull();
    expect(followUpFor({ result: "TAUGHT_WITH_DIFFICULTIES", uncoveredOutcomeIds: ["o1"] })).toBeNull();
  });
});

describe("formatLessonDay", () => {
  it("names the weekday and the date in the interface locale", () => {
    // 2020-03-10 is a Tuesday.
    expect(formatLessonDay("2020-03-10", "pt-PT")).toContain("10");
    expect(formatLessonDay("2020-03-10", "pt-PT")).toContain("março");
    expect(formatLessonDay("2020-03-10", "en")).toContain("Tuesday");
  });
});
