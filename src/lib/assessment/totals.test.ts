import { describe, expect, it } from "vitest";
import type { AssessmentDocument, AssessmentExercise } from "@/types/assessment";
import { computeTotals } from "./totals";

const ex = (id: string, points: number | null): AssessmentExercise => ({
  id, kind: "exercise", type: "short_answer", prompt: "p", options: null,
  answer: { optionIds: null, text: null, pairs: null, order: null, truth: null, gaps: null, labels: null, cells: null, classes: null },
  explanation: null, points, answerSpace: { kind: "lines", count: 2 }, media: null,
  aeCodes: [], aeOutcomeIds: [], criteria: null, labels: null, words: null, grid: null, table: null, categories: null,
});

const doc = (targetTotal: number | null, sections: (number | null)[][]): AssessmentDocument => ({
  schemaVersion: 1, documentType: "test", title: null,
  header: { school: null, gradeClass: null, duration: null, showFields: [] },
  targetTotal,
  sections: sections.map((pts, i) => ({
    id: `s${i + 1}`, title: "t", instructions: null,
    items: pts.map((p, j) => ex(`e${i}${j}`, p)),
  })),
});

describe("computeTotals", () => {
  it("totalsSumSectionsAndFlagOffTarget", () => {
    const r = computeTotals(doc(100, [[30, 30], [35]]));
    expect(r.sections).toEqual([{ id: "s1", points: 60 }, { id: "s2", points: 35 }]);
    expect(r.total).toBe(95);
    expect(r.target).toBe(100);
    expect(r.onTarget).toBe(false);
  });

  it("totalsNullTargetAlwaysOnTarget", () => {
    const r = computeTotals(doc(null, [[null, 5]]));
    expect(r.total).toBe(5);
    expect(r.target).toBeNull();
    expect(r.onTarget).toBe(true);
  });

  it("hits target exactly", () => {
    expect(computeTotals(doc(100, [[60], [40]])).onTarget).toBe(true);
  });
});
