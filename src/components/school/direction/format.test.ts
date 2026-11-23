import { describe, expect, it } from "vitest";
import type { DirectionTurma } from "@/shared/types/school-direction";
import { departmentExecution, formatClass, formatSubject, nextSchoolDay, recordCoverage } from "./format";

describe("nextSchoolDay", () => {
  it("is tomorrow on a weekday before Friday and Monday from Friday or the weekend", () => {
    const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    expect(iso(nextSchoolDay(new Date(2026, 10, 18)))).toBe("2026-11-19"); // Wed → Thu
    expect(iso(nextSchoolDay(new Date(2026, 10, 20)))).toBe("2026-11-23"); // Fri → Mon
    expect(iso(nextSchoolDay(new Date(2026, 10, 21)))).toBe("2026-11-23"); // Sat → Mon
    expect(iso(nextSchoolDay(new Date(2026, 10, 22)))).toBe("2026-11-23"); // Sun → Mon
  });
});

const turma = (over: Partial<DirectionTurma>): DirectionTurma => ({
  id: "t",
  title: "Turma",
  grade: 5,
  classLabel: "A",
  subjectKey: "mathematics",
  subjectLabel: "Mathematics",
  department: "maths_science",
  state: "on_track",
  executionPercent: 100,
  lessonsPast: 10,
  lessonsBehind: 0,
  behindTopic: null,
  teacher: { userId: "u", name: null, email: null },
  ...over,
});

describe("departmentExecution", () => {
  it("sums lessons over the counted turmas instead of averaging their percents", () => {
    // 10 of 10 and 2 of 4 held: 12 of 14 is 86%, where the average of 100% and 50% would say 75%.
    const result = departmentExecution([
      turma({ lessonsPast: 10, lessonsBehind: 0 }),
      turma({ state: "behind", lessonsPast: 4, lessonsBehind: 2 }),
    ]);
    expect(result).toEqual([{ department: "maths_science", percent: 86, onPlan: 12, past: 14 }]);
  });

  it("leaves out turmas without records and departments with no counted turma", () => {
    const result = departmentExecution([
      turma({ state: "no_records", lessonsPast: 8, lessonsBehind: 8 }),
      turma({ state: "not_started", lessonsPast: 0 }),
      turma({ department: "languages", state: "watch", lessonsPast: 20, lessonsBehind: 1 }),
    ]);
    expect(result).toEqual([{ department: "languages", percent: 95, onPlan: 19, past: 20 }]);
  });

  it("never shows 100% while lessons are behind", () => {
    expect(departmentExecution([turma({ lessonsPast: 500, lessonsBehind: 2 })])).toEqual([
      { department: "maths_science", percent: 99, onPlan: 498, past: 500 },
    ]);
  });

  it("is empty for no turmas", () => {
    expect(departmentExecution([])).toEqual([]);
  });
});

describe("recordCoverage", () => {
  it("counts turmas with lessons past, and those of them with records", () => {
    expect(
      recordCoverage([
        turma({}),
        turma({ state: "behind" }),
        turma({ state: "no_records" }),
        turma({ state: "not_started", lessonsPast: 0 }),
      ]),
    ).toEqual({ measured: 2, expected: 3 });
  });
});

describe("formatClass and formatSubject for Brazil (BR)", () => {
  it("names Brazilian years and series", () => {
    expect(formatClass(6, "B", "pt-BR", "BR")).toBe("6º ano B");
    expect(formatClass(10, "A", "pt-BR", "BR")).toBe("1ª série A");
    expect(formatClass(12, "C", "pt-BR", "BR")).toBe("3ª série C");
  });

  it("keeps the Portuguese class names by default", () => {
    expect(formatClass(5, "B", "pt-PT")).toBe("5.º B");
    expect(formatClass(10, "A", "pt-PT", "PT")).toBe("10.º A");
    expect(formatClass(5, "B", "en")).toBe("Year 5 B");
  });

  it("shows a Brazilian subject by its pt-BR name", () => {
    expect(formatSubject("Matemática", "Matemática", "BR")).toBe("Matemática");
    expect(formatSubject("Língua Portuguesa", "Língua Portuguesa", "BR")).toBe("Língua Portuguesa");
  });
});
