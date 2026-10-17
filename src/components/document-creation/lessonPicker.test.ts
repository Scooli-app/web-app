import { describe, expect, it } from "vitest";
import type { MyWeek, MyWeekLesson } from "@/shared/types/my-week";
import { lessonChoices } from "./lessonPicker";

const lesson = (id: string, slotDate: string, extra: Partial<MyWeekLesson> = {}): MyWeekLesson => ({
  id,
  slotDate,
  slotType: "LESSON",
  topicTitle: `Topic ${id}`,
  status: "pending",
  documentId: null,
  sequenceNumber: 1,
  description: null,
  durationMinutes: 50,
  documents: [],
  ...extra,
});

const week = (lessons: MyWeekLesson[], extraClass: Partial<MyWeek["classes"][number]> = {}): MyWeek => ({
  weekStart: "2026-10-17",
  classes: [
    {
      timetableId: "tt-math",
      title: "Matemática",
      classLabel: "A",
      subject: "Mathematics",
      gradeLevel: 2,
      color: "#7F77DD",
      lessons,
      ...extraClass,
    },
  ],
});

describe("lessonChoices", () => {
  it("lists teaching lessons in date order with the turma's year and subject id", () => {
    const choices = lessonChoices(week([lesson("b", "2026-10-20"), lesson("a", "2026-10-19")]), "quiz");

    expect(choices.map((c) => c.lessonId)).toEqual(["a", "b"]);
    expect(choices[0]).toMatchObject({
      timetableId: "tt-math",
      slotDate: "2026-10-19",
      topicTitle: "Topic a",
      gradeLevel: 2,
      subjectId: "matematica",
      disabled: false,
    });
  });

  it("leaves out holidays and skipped lessons", () => {
    const choices = lessonChoices(
      week([
        lesson("h", "2026-10-19", { slotType: "HOLIDAY" }),
        lesson("s", "2026-10-20", { status: "skipped" }),
        lesson("ok", "2026-10-21"),
      ]),
      "quiz",
    );

    expect(choices.map((c) => c.lessonId)).toEqual(["ok"]);
  });

  it("marks a lesson that already has this kind of document as unavailable", () => {
    const choices = lessonChoices(
      week([
        lesson("has", "2026-10-19", {
          documents: [{ id: "d", role: "quiz", documentType: "quiz", title: "", status: "completed" }],
        }),
        lesson("failed", "2026-10-20", {
          documents: [{ id: "f", role: "quiz", documentType: "quiz", title: "", status: "failed" }],
        }),
      ]),
      "quiz",
    );

    expect(choices.find((c) => c.lessonId === "has")?.disabled).toBe(true);
    expect(choices.find((c) => c.lessonId === "failed")?.disabled).toBe(false);
  });

  it("keeps an unknown subject as no subject id", () => {
    const choices = lessonChoices(week([lesson("a", "2026-10-19")], { subject: "Robótica" }), "quiz");

    expect(choices[0].subjectId).toBeNull();
  });
});
