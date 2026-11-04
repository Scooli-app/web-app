import { describe, expect, it } from "vitest";
import type { DirectionTurma } from "@/shared/types/school-direction";
import { departmentExecution } from "./format";

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
    expect(result).toEqual([{ department: "maths_science", percent: 86 }]);
  });

  it("leaves out turmas without records and departments with no counted turma", () => {
    const result = departmentExecution([
      turma({ state: "no_records", lessonsPast: 8, lessonsBehind: 8 }),
      turma({ state: "not_started", lessonsPast: 0 }),
      turma({ department: "languages", state: "watch", lessonsPast: 20, lessonsBehind: 1 }),
    ]);
    expect(result).toEqual([{ department: "languages", percent: 95 }]);
  });

  it("is empty for no turmas", () => {
    expect(departmentExecution([])).toEqual([]);
  });
});
