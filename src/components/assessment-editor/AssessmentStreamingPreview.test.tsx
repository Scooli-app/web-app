import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

const { AssessmentStreamingPreview, streamedExerciseCount } = await import("./AssessmentStreamingPreview");

const partial = {
  schemaVersion: 1,
  documentType: "test",
  title: "Teste — Equações",
  header: { showFields: [] },
  targetTotal: 100,
  sections: [
    {
      id: "a",
      title: "Grupo I",
      instructions: null,
      items: [
        {
          id: "e1", kind: "exercise", type: "short_answer", prompt: "Resolve 2x + 5 = 17.", options: null,
          answer: { text: "x = 6" }, explanation: "2x = 12", points: 10, answerSpace: { kind: "lines", count: 2 },
          media: null, aeCodes: [], aeOutcomeIds: [], criteria: null, labels: null, words: null, grid: null,
          table: null, categories: null,
        },
        { id: "r1", kind: "reading", title: "Texto", body: "Lê com atenção." },
      ],
    },
  ],
};

describe("AssessmentStreamingPreview", () => {
  it("counts the streamed exercises, not reading boxes", () => {
    expect(streamedExerciseCount(partial)).toBe(1);
    expect(streamedExerciseCount(null)).toBe(0);
    expect(streamedExerciseCount({ sections: "nope" })).toBe(0);
  });

  it("shows the questions as the student sees them while writing", () => {
    const html = renderToStaticMarkup(
      createElement(AssessmentStreamingPreview, { partial, phase: "generating", imageProgress: null, error: null }),
    );
    expect(html).toContain("Resolve 2x + 5 = 17.");
    expect(html).toContain("writingSubtitle:1");
    expect(html).toContain("writingNext");
    // Unverified answers stay hidden.
    expect(html).not.toContain("x = 6");
  });

  it("says the answers are being checked once writing is done", () => {
    const html = renderToStaticMarkup(
      createElement(AssessmentStreamingPreview, { partial, phase: "reviewing", imageProgress: null, error: null }),
    );
    expect(html).toContain("reviewingTitle");
    expect(html).not.toContain("writingNext");
  });
});
