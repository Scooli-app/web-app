import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${Object.values(values).join(",")}` : key,
}));

const { AssessmentStreamingPreview, assessmentFollowTarget, streamedExerciseCount } = await import("./AssessmentStreamingPreview");

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

  const withPicture = {
    ...partial,
    sections: [
      {
        ...partial.sections[0],
        items: [
          partial.sections[0].items[0],
          {
            id: "r2", kind: "reading", title: "Imagem", body: "Observa a figura.",
            media: { imageRef: null, placeholder: { query: "Esquema do sistema digestivo humano", alt: "Sistema digestivo" } },
          },
        ],
      },
    ],
  };

  it("shows a picture still to come as queued while writing, not as missing", () => {
    const html = renderToStaticMarkup(
      createElement(AssessmentStreamingPreview, { partial: withPicture, phase: "generating", imageProgress: null, error: null }),
    );
    expect(html).toContain("imageQueued");
    expect(html).not.toContain("imageMissing");
    expect(html).not.toContain("data-generation-pending");
  });

  it("marks the pictures being made, so the screen can follow them, and shows the progress", () => {
    const html = renderToStaticMarkup(
      createElement(AssessmentStreamingPreview, {
        partial: withPicture, phase: "images", imageProgress: { completed: 0, total: 1 }, error: null,
      }),
    );
    expect(html).toContain("imageGenerating");
    expect(html).toContain("data-generation-pending");
    expect(html).toContain("imagesSubtitle:0,1");
    expect(html).toContain('role="progressbar"');
  });

  it("says a picture that failed is missing", () => {
    const html = renderToStaticMarkup(
      createElement(AssessmentStreamingPreview, {
        partial: withPicture, phase: "images", imageProgress: { completed: 1, total: 2 }, imageOutcomes: { r2: "failed" }, error: null,
      }),
    );
    expect(html).toContain("imageMissing");
    expect(html).not.toContain("imageGenerating");
  });

  it("stands in empty pages before the first question, and says when it is writing a second draft", () => {
    const first = renderToStaticMarkup(
      createElement(AssessmentStreamingPreview, { partial: null, phase: "preparing", imageProgress: null, error: null }),
    );
    expect(first).toContain("startingSubtitle");
    expect(first).toContain("aspect-ratio:210 / 297");
    const retry = renderToStaticMarkup(
      createElement(AssessmentStreamingPreview, { partial: null, phase: "generating", imageProgress: null, attempt: 2, error: null }),
    );
    expect(retry).toContain("retrying");
  });

  it("follows the newest question, then the next picture, then stays put", () => {
    expect(assessmentFollowTarget("generating", null)).toBe("end");
    expect(assessmentFollowTarget("reviewing", null)).toBeNull();
    expect(assessmentFollowTarget("reviewing", { completed: 1, total: 3 })).toBe("pending");
    expect(assessmentFollowTarget("images", { completed: 3, total: 3 })).toBeNull();
  });
});
