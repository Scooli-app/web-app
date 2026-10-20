import type { Document } from "@/shared/types/document";

/**
 * Whether a planificação can be read to create a turma: only a finished one has content. One still generating,
 * or one whose generation or import failed, is left out of the turma wizard's plan picker.
 */
export function isReadyPlan(plan: Pick<Document, "status">): boolean {
  return plan.status === "completed";
}
