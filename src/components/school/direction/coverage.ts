import type { DirectionTurma } from "@/shared/types/school-direction";

/** What the panel's numbers cover: its turmas and the teachers who plan them in Scooli. */
export function coverageCounts(turmas: DirectionTurma[]): { turmas: number; teachers: number } {
  return { turmas: turmas.length, teachers: new Set(turmas.map((turma) => turma.teacher.userId)).size };
}
