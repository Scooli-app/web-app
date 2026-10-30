import type { AssessmentExercise } from "@/types/assessment";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { AssessmentEditorContext } = await import("./context");
const { ExerciseView } = await import("./ExerciseView");

const exercise: AssessmentExercise = {
  id: "e1", kind: "exercise", type: "short_answer", prompt: "Which fraction is greater?", options: null,
  answer: { optionIds: null, text: "1/2", pairs: null, order: null, truth: null, gaps: null, labels: null, cells: null, classes: null },
  explanation: null, points: null, answerSpace: { kind: "lines", count: 1 }, media: null, aeCodes: [],
  aeOutcomeIds: ["o1"], criteria: null, labels: null, words: null, grid: null, table: null, categories: null,
};

const render = (showAe: boolean) =>
  renderToStaticMarkup(
    createElement(
      AssessmentEditorContext.Provider,
      {
        value: {
          studentView: false, phone: false, showAe, searchAe: null, rememberAe: () => undefined, requestImage: () => undefined,
          aeLookup: { o1: { id: "o1", topicLeaf: "Frações", text: "Comparar e ordenar frações", retired: false } },
        },
      },
      createElement(ExerciseView, { exercise, number: 1 }),
    ),
  );

describe("ExerciseView AE chips", () => {
  it("shows the outcome chip on a Portuguese document", () => {
    expect(render(true)).toContain("Comparar e ordenar frações");
  });

  it("hides it on an English document: the outcomes exist only in Portuguese", () => {
    const html = render(false);
    expect(html).not.toContain("Comparar e ordenar frações");
    expect(html).toContain("Which fraction is greater?");
  });
});
