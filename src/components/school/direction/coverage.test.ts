import { describe, expect, it } from "vitest";
import type { DirectionTurma } from "@/shared/types/school-direction";
import { coverageCounts } from "./coverage";

const turma = (id: string, teacherId: string) =>
  ({ id, teacher: { userId: teacherId, name: null, email: null } }) as DirectionTurma;

describe("coverageCounts", () => {
  it("counts the turmas and the distinct teachers behind the panel", () => {
    expect(coverageCounts([turma("a", "t1"), turma("b", "t1"), turma("c", "t2")])).toEqual({
      turmas: 3,
      teachers: 2,
    });
  });

  it("is zero for a school with no turmas yet", () => {
    expect(coverageCounts([])).toEqual({ turmas: 0, teachers: 0 });
  });
});
