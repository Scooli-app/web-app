import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => vi.fn(), useAppSelector: () => undefined }));
vi.mock("@/store/moderation", () => ({}));

const { ResourceContentPreview } = await import("./ModerationQueue");

const WORKSHEET = JSON.stringify({
  schemaVersion: 1,
  documentType: "worksheet",
  title: "Animais vertebrados",
  header: { school: null, gradeClass: null, duration: null, showFields: [] },
  targetTotal: null,
  sections: [{
    id: "g1",
    title: "Grupo I",
    instructions: "Lê com atenção.",
    items: [{
      id: "e1", kind: "exercise", type: "multiple_choice", prompt: "Qual é um <b>mamífero</b>?", points: null,
      options: [{ id: "a", text: "Golfinho", side: null }, { id: "b", text: "Sardinha", side: null }],
      answer: { optionIds: ["a"] }, answerSpace: { kind: "none", count: null },
      explanation: "O golfinho respira por pulmões.", aeCodes: [], aeOutcomeIds: [],
    }],
  }],
});

const render = (contentFormat: "json" | "markdown" | undefined, content: string) =>
  renderToStaticMarkup(createElement(ResourceContentPreview, { resource: { content, contentFormat } }));

describe("ResourceContentPreview", () => {
  it("renders a shared assessment with the exercise views in the teacher view, never its JSON", () => {
    const html = render("json", WORKSHEET);

    expect(html).toContain("data-assessment-preview");
    expect(html).toContain("Animais vertebrados");
    expect(html).toContain("Grupo I");
    expect(html).toContain("Golfinho");
    expect(html).toContain("Sardinha");
    expect(html).not.toContain("schemaVersion");
    expect(html).not.toContain("optionIds");
    // Markup inside the JSON is text, not HTML.
    expect(html).not.toContain("<b>mamífero</b>");
    // Teacher view: the moderator checks the answers and explanations too (final review).
    expect(html).toContain("respira por pulmões");
  });

  it("keeps the HTML preview for markdown resources", () => {
    const html = render(undefined, "<p>Plano de aula</p>");

    expect(html).toContain("<p>Plano de aula</p>");
    expect(html).not.toContain("data-assessment-preview");
  });
});
