import { describe, expect, it } from "vitest";
import { lessonOf } from "./useDocumentChat";

describe("lessonOf", () => {
  it("returns the lesson a document belongs to", () => {
    expect(lessonOf({ classInfo: { timetableId: "t1", lessonId: "l1" } })).toEqual({ timetableId: "t1", lessonId: "l1" });
  });

  it("is null for a document in a turma but no lesson, or in none", () => {
    expect(lessonOf({ classInfo: { timetableId: "t1", lessonId: null } })).toBeNull();
    expect(lessonOf({ classInfo: null })).toBeNull();
    expect(lessonOf({})).toBeNull();
  });
});
