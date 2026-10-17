import { describe, expect, it } from "vitest";
import type { MyWeekLessonDocument } from "@/shared/types/my-week";
import { preparationCost, subjectProfile, suggestedDocuments } from "./lessonSuggestions";

const ON = { worksheet: true, presentation: true };
const doc = (role: string, status = "completed"): MyWeekLessonDocument => ({
  id: `d-${role}`,
  role,
  documentType: role,
  title: role,
  status,
});

describe("subjectProfile", () => {
  it("treats maths, sciences of practice and languages as practical", () => {
    expect(subjectProfile("Mathematics")).toBe("practical");
    expect(subjectProfile("Physics and Chemistry A")).toBe("practical");
    expect(subjectProfile("English")).toBe("practical");
  });

  it("treats history, geography and natural sciences as visual", () => {
    expect(subjectProfile("History")).toBe("visual");
    expect(subjectProfile("Geography A")).toBe("visual");
    expect(subjectProfile("Natural Sciences")).toBe("visual");
    expect(subjectProfile("Environmental Studies")).toBe("visual");
  });

  it("defaults an unknown subject to practical", () => {
    expect(subjectProfile("Robótica")).toBe("practical");
    expect(subjectProfile(null)).toBe("practical");
  });
});

describe("suggestedDocuments", () => {
  it("prepares a plan and a worksheet for a practical lesson", () => {
    expect(suggestedDocuments("LESSON", "Mathematics", [], ON)).toEqual(["lessonPlan", "worksheet"]);
  });

  it("prepares a plan and slides for a visual lesson", () => {
    expect(suggestedDocuments("LESSON", "History", [], ON)).toEqual(["lessonPlan", "presentation"]);
  });

  it("practice lessons get a worksheet with a quiz or slides", () => {
    expect(suggestedDocuments("EXERCISE", "Mathematics", [], ON)).toEqual(["worksheet", "quiz"]);
    expect(suggestedDocuments("EXERCISE", "History", [], ON)).toEqual(["worksheet", "presentation"]);
  });

  it("reviews get a quiz with a worksheet or slides", () => {
    expect(suggestedDocuments("REVIEW", "Mathematics", [], ON)).toEqual(["worksheet", "quiz"]);
    expect(suggestedDocuments("REVIEW", "Geography", [], ON)).toEqual(["quiz", "presentation"]);
  });

  it("an assessment gets a test", () => {
    expect(suggestedDocuments("ASSESSMENT", "History", [], ON)).toEqual(["test"]);
  });

  it("only suggests what the lesson doesn't have yet", () => {
    expect(suggestedDocuments("LESSON", "Mathematics", [doc("lessonPlan")], ON)).toEqual(["worksheet"]);
    expect(suggestedDocuments("LESSON", "Mathematics", [doc("lessonPlan"), doc("worksheet")], ON)).toEqual([]);
  });

  it("a failed document is suggested again", () => {
    expect(suggestedDocuments("LESSON", "Mathematics", [doc("worksheet", "failed")], ON)).toEqual([
      "lessonPlan",
      "worksheet",
    ]);
  });

  it("drops types whose creation is switched off", () => {
    expect(suggestedDocuments("LESSON", "History", [], { worksheet: true, presentation: false })).toEqual([
      "lessonPlan",
    ]);
  });

  it("suggests nothing for a holiday", () => {
    expect(suggestedDocuments("HOLIDAY", "Mathematics", [], ON)).toEqual([]);
  });
});

describe("preparationCost", () => {
  const FREE = { isPro: false, freeWeekStart: "2026-10-12" };

  it("shows no cost to Pro teachers", () => {
    expect(preparationCost([{ slotDate: "2026-10-14", types: ["lessonPlan", "worksheet"] }], { isPro: true, freeWeekStart: null })).toBeNull();
  });

  it("a lesson plan in the free week is free, other documents cost a credit each", () => {
    expect(preparationCost([{ slotDate: "2026-10-14", types: ["lessonPlan", "worksheet"] }], FREE)).toBe(1);
  });

  it("a lesson plan outside the free week costs a credit", () => {
    expect(preparationCost([{ slotDate: "2026-10-21", types: ["lessonPlan"] }], FREE)).toBe(1);
  });

  it("with no free week claimed yet, the first lesson's week becomes the free one", () => {
    const lessons = [
      { slotDate: "2026-10-23", types: ["lessonPlan"] as const },
      { slotDate: "2026-10-19", types: ["lessonPlan"] as const },
      { slotDate: "2026-10-27", types: ["lessonPlan"] as const },
    ];
    expect(preparationCost(lessons.map((l) => ({ ...l, types: [...l.types] })), { isPro: false, freeWeekStart: null })).toBe(1);
  });

  it("unknown limits count every document", () => {
    expect(preparationCost([{ slotDate: "2026-10-14", types: ["lessonPlan", "quiz"] }], null)).toBe(2);
  });
});
