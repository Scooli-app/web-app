import type { AssessmentDocument } from "@/types/assessment";

export function computeTotals(doc: AssessmentDocument) {
  const sections = doc.sections.map((s) => ({
    id: s.id,
    points: s.items.reduce((sum, i) => sum + (i.kind === "exercise" ? (i.points ?? 0) : 0), 0),
  }));
  const total = sections.reduce((sum, s) => sum + s.points, 0);
  const target = doc.targetTotal;
  return { sections, total, target, onTarget: target === null || total === target };
}
