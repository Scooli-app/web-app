import type { DocumentVersionDiff, SectionChange } from "@/shared/types/document-suggestions";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SuggestionReviewBody } from "./SuggestionReviewSheet";
import { initialSelection } from "./suggestion-review";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "pt-PT" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/api/document-versions.service", () => ({
  getSuggestionDiff: vi.fn(),
  applySuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
}));
vi.mock("@/components/document-editor-v2/SlideThumbnail", () => ({ SlideThumbnail: () => null }));

function render(diff: DocumentVersionDiff, selection = initialSelection(diff.changes), contentFormat: "markdown" | "json" = "markdown") {
  return renderToStaticMarkup(
    createElement(SuggestionReviewBody, { diff, selection, contentFormat, onToggle: () => undefined }),
  );
}

const CHANGED: SectionChange = {
  key: "objetivos",
  type: "changed",
  title: "Objetivos",
  before: "Os alunos conhecem a fração.",
  after: "Os alunos dominam a fração equivalente.",
  position: 1,
};

describe("SuggestionReviewBody: diff rendering", () => {
  it("renders an inserted word with the insertion marker and a deleted word struck through", () => {
    const html = render({ stale: false, changes: [CHANGED] });

    expect(html).toContain("<ins");
    expect(html).toContain("dominam");
    expect(html).toContain("bg-emerald-500/15");
    expect(html).toContain("<del");
    expect(html).toContain("line-through");
    expect(html).toContain("conhecem");
  });

  it("labels each section checkbox with the section title", () => {
    const html = render({ stale: false, changes: [CHANGED] });

    expect(html).toContain('aria-label="Objetivos"');
    expect(html).toContain('role="checkbox"');
  });

  it("gives a changed section a Antes / Depois / Alterações toggle", () => {
    const html = render({ stale: false, changes: [CHANGED] });

    expect(html).toContain("view.before");
    expect(html).toContain("view.after");
    expect(html).toContain("view.changes");
  });

  it("shows a new section as its own text, not a diff against nothing", () => {
    const html = render({
      stale: false,
      changes: [{ key: "nova", type: "added", title: "Extra", before: null, after: "Conteúdo novo", position: 0 }],
    });

    expect(html).toContain("Conteúdo novo");
    expect(html).toContain("type.added");
    expect(html).not.toContain("view.changes");
  });
});

describe("SuggestionReviewBody: stale notice and unchanged sections", () => {
  it("shows the stale notice when the teacher edited after the suggestion", () => {
    const html = render({ stale: true, changes: [CHANGED] });

    expect(html).toContain("staleNotice");
  });

  it("does not show the stale notice otherwise", () => {
    const html = render({ stale: false, changes: [CHANGED] });

    expect(html).not.toContain("staleNotice");
  });

  it("collapses unchanged sections into a count line instead of listing them", () => {
    const html = render({
      stale: false,
      changes: [CHANGED, { key: "resto", type: "unchanged", title: "Resto", before: "x", after: "x", position: 2 }],
    });

    expect(html).toContain("unchangedCount");
    expect(html).not.toContain("Resto");
  });
});

describe("SuggestionReviewBody: selection", () => {
  it("renders the checkbox checked for a selected section and unchecked otherwise", () => {
    const html = render({ stale: false, changes: [CHANGED] }, new Set());

    expect(html).toMatch(/role="checkbox" aria-checked="false"/);
    expect(html).not.toMatch(/role="checkbox" aria-checked="true"/);
  });
});
