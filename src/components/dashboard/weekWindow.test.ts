import { describe, expect, it } from "vitest";
import type { MyWeek, MyWeekLesson, MyWeekLessonDocument } from "@/shared/types/my-week";
import { companionTypesFor, hasGeneratingDocument, objectiveItems, pickFocusDay, weekTitle, windowDays } from "./weekWindow";

const ALL_ON = { worksheet: true, presentation: true };

function lesson(slotDate: string, documents: MyWeekLessonDocument[] = [], slotType = "LESSON"): MyWeekLesson {
  return {
    id: `l-${slotDate}`,
    slotDate,
    slotType,
    topicTitle: "Tema",
    status: "pending",
    documentId: null,
    sequenceNumber: 1,
    description: null,
    durationMinutes: 50,
    documents,
  };
}

function week(lessons: MyWeekLesson[], nextLessonDate: string | null = null): MyWeek {
  return {
    weekStart: "2026-10-16",
    nextLessonDate,
    classes: [
      { timetableId: "t", title: "Matemática", classLabel: "", subject: "Mathematics", gradeLevel: 2, color: "#7F77DD", lessons },
    ],
  };
}

const doc = (role: string, status = "completed"): MyWeekLessonDocument => ({
  id: `d-${role}`,
  role,
  documentType: role,
  title: role,
  status,
});

describe("windowDays", () => {
  it("lists today and the 6 days after it", () => {
    const days = windowDays("2026-10-16");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-16");
    expect(days[6]).toBe("2026-10-22");
  });
});

describe("pickFocusDay", () => {
  it("is today when today has lessons", () => {
    expect(pickFocusDay("2026-10-16", week([lesson("2026-10-16")]))).toEqual({ iso: "2026-10-16", isToday: true });
  });

  it("is the next day with lessons when today has none", () => {
    expect(pickFocusDay("2026-10-16", week([lesson("2026-10-19")]))).toEqual({ iso: "2026-10-19", isToday: false });
  });

  it("is the next lesson date beyond the window when the window is empty", () => {
    expect(pickFocusDay("2026-10-16", week([], "2026-10-27"))).toEqual({ iso: "2026-10-27", isToday: false });
  });

  it("is nothing when there are no lessons at all", () => {
    expect(pickFocusDay("2026-10-16", week([]))).toBeNull();
  });
});

describe("companionTypesFor", () => {
  it("offers the classroom materials a planned lesson doesn't have yet", () => {
    expect(companionTypesFor("LESSON", [doc("lessonPlan")], ALL_ON)).toEqual(["worksheet", "quiz", "presentation"]);
  });

  it("offers a plan, a quiz and a test for an assessment", () => {
    expect(companionTypesFor("ASSESSMENT", [], ALL_ON)).toEqual(["lessonPlan", "quiz", "test"]);
  });

  it("hides types whose creation is switched off", () => {
    expect(companionTypesFor("LESSON", [], { worksheet: false, presentation: false })).toEqual(["lessonPlan", "quiz"]);
  });

  it("offers a type again when its document failed", () => {
    expect(companionTypesFor("LESSON", [doc("lessonPlan"), doc("quiz", "failed")], ALL_ON)).toEqual([
      "worksheet",
      "quiz",
      "presentation",
    ]);
  });

  it("offers nothing on a holiday", () => {
    expect(companionTypesFor("HOLIDAY", [], ALL_ON)).toEqual([]);
  });
});

describe("hasGeneratingDocument", () => {
  it("is true while any lesson document is still being prepared", () => {
    expect(hasGeneratingDocument(week([lesson("2026-10-16", [doc("quiz", "processing")])]))).toBe(true);
    expect(hasGeneratingDocument(week([lesson("2026-10-16", [doc("quiz", "generating")])]))).toBe(true);
    expect(hasGeneratingDocument(week([lesson("2026-10-16", [doc("quiz")])]))).toBe(false);
  });
});

describe("objectiveItems", () => {
  it("splits dash-separated objectives into items", () => {
    expect(objectiveItems("- Reconhecer as propriedades - Aplicar as propriedades - Identificar erros")).toEqual([
      "Reconhecer as propriedades",
      "Aplicar as propriedades",
      "Identificar erros",
    ]);
  });

  it("splits one objective per line", () => {
    expect(objectiveItems("Explicar a evaporação\nDescrever a condensação")).toEqual([
      "Explicar a evaporação",
      "Descrever a condensação",
    ]);
  });

  it("drops the dash of a dashed list written one item per line", () => {
    expect(objectiveItems("- Reconhecer as propriedades\n- Aplicar as propriedades")).toEqual([
      "Reconhecer as propriedades",
      "Aplicar as propriedades",
    ]);
  });

  it("keeps hyphenated words and returns nothing for empty text", () => {
    expect(objectiveItems("Usar o dia-a-dia como exemplo")).toEqual(["Usar o dia-a-dia como exemplo"]);
    expect(objectiveItems(null)).toEqual([]);
  });
});

describe("weekTitle", () => {
  const TODAY = "2026-10-16";

  it("says today only when the window starts today and today has lessons", () => {
    expect(weekTitle(TODAY, TODAY, { iso: TODAY, isToday: true })).toEqual({ kind: "today", iso: TODAY });
  });

  it("names the next lesson day when today has none", () => {
    expect(weekTitle(TODAY, TODAY, { iso: "2026-10-19", isToday: false })).toEqual({ kind: "focus", iso: "2026-10-19" });
  });

  it("never says today after moving the window with the arrows", () => {
    expect(weekTitle("2026-10-23", TODAY, { iso: "2026-10-23", isToday: true })).toEqual({ kind: "window", iso: "2026-10-23" });
  });

  it("falls back to the window when nothing is planned at all", () => {
    expect(weekTitle(TODAY, TODAY, null)).toEqual({ kind: "window", iso: TODAY });
  });
});
