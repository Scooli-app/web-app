import { describe, expect, it } from "vitest";
import { parseAbsences } from "./absences";

const lesson = {
  slotId: "s1",
  turmaId: "t1",
  grade: 5,
  classLabel: "B",
  subjectLabel: "Mathematics",
  sequenceNumber: 21,
  topicTitle: "Probabilities",
  lastLesson: { date: "2026-10-28", topicTitle: "Mean", teachingStatus: "partially_taught", note: "Left halfway" },
  documents: [{ title: "Lesson plan", documentType: "lessonPlan" }],
};

const absence = {
  id: "u1|2026-11-04",
  teacherName: "Ana Lopes",
  substituteName: "João Reis",
  date: "2026-11-04",
  sent: ["s1"],
  handover: { teacher: { userId: "u1", name: "Ana Lopes", email: null }, date: "2026-11-04", lessons: [lesson] },
};

describe("parseAbsences", () => {
  it("keeps an entry the board wrote", () => {
    expect(parseAbsences([absence])).toEqual([absence]);
  });

  it("drops entries of the wrong shape instead of throwing", () => {
    expect(parseAbsences([null])).toEqual([]);
    expect(parseAbsences([{}])).toEqual([]);
    expect(parseAbsences("nope")).toEqual([]);
    expect(parseAbsences(null)).toEqual([]);
    expect(parseAbsences([{ ...absence, sent: "s1" }])).toEqual([]);
    expect(parseAbsences([{ ...absence, handover: { lessons: [null] } }])).toEqual([]);
  });

  it("reads a lesson without documents as having none", () => {
    const { documents, ...withoutDocuments } = lesson;
    expect(documents).toHaveLength(1);
    const [parsed] = parseAbsences([{ ...absence, handover: { ...absence.handover, lessons: [withoutDocuments] } }]);
    expect(parsed.handover.lessons[0].documents).toEqual([]);
  });

  it("keeps the good entries next to a bad one", () => {
    expect(parseAbsences([null, absence, {}])).toEqual([absence]);
  });
});
