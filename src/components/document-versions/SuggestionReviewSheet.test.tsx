import type { DocumentVersionDiff, SectionChange } from "@/shared/types/document-suggestions";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SuggestionReviewBody } from "./SuggestionReviewSheet";
import { initialSelection } from "./suggestion-review";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  useLocale: () => "pt-PT",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/api/document-versions.service", () => ({
  getSuggestionDiff: vi.fn(),
  applySuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
}));
vi.mock("@/components/document-editor-v2/SlideThumbnail", () => ({
  SlideThumbnail: ({ slide }: { slide: { elements: unknown[] } }) =>
    createElement("div", { "data-testid": "slide-thumb", "data-element-count": String(slide.elements.length) }),
}));

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

const V1_TITLE_SLIDE = JSON.stringify({
  id: "s1",
  type: "slide",
  layout: "title",
  title: "Frações equivalentes",
  subtitle: "5.º ano",
});

const V2_SLIDE = JSON.stringify({ id: "s2", layout: "title", background: {}, elements: [{ id: "e1" }, { id: "e2" }] });

describe("SuggestionReviewBody: presentations", () => {
  it("renders a v1 block as a slide thumbnail instead of the no-slide placeholder", () => {
    const html = render(
      {
        stale: false,
        changes: [{ key: "s1", type: "changed", title: "Slide 1", before: V1_TITLE_SLIDE, after: V1_TITLE_SLIDE, position: 1 }],
      },
      undefined,
      "json",
    );

    expect(html).toContain('data-testid="slide-thumb"');
    expect(html).not.toMatch(/data-element-count="0"/);
    expect(html).not.toContain("noSlide");
  });

  it("keeps rendering a v2 canvas slide as it is", () => {
    const html = render(
      {
        stale: false,
        changes: [{ key: "s2", type: "changed", title: "Slide 2", before: V2_SLIDE, after: V2_SLIDE, position: 1 }],
      },
      undefined,
      "json",
    );

    expect(html).toContain('data-element-count="2"');
  });

  it("renders the deck settings section as a text row, not a slide", () => {
    const html = render(
      {
        stale: false,
        changes: [
          {
            key: "_meta",
            type: "changed",
            title: "_meta",
            before: JSON.stringify({ schemaVersion: 1, documentType: "presentation", themeId: "dark" }),
            after: JSON.stringify({ schemaVersion: 1, documentType: "presentation", themeId: "galaxia" }),
            position: 0,
          },
        ],
      },
      undefined,
      "json",
    );

    expect(html).toContain("presentationSettings");
    expect(html).toContain("themeChange");
    expect(html).not.toContain("slide-thumb");
    expect(html).not.toContain("noSlide");
  });

  it("omits the theme line for the settings section when the theme did not change", () => {
    const same = JSON.stringify({ schemaVersion: 1, documentType: "presentation", themeId: "dark" });
    const html = render(
      {
        stale: false,
        changes: [{ key: "_meta", type: "changed", title: "_meta", before: same, after: same, position: 0 }],
      },
      undefined,
      "json",
    );

    expect(html).toContain("presentationSettings");
    expect(html).not.toContain("themeChange");
  });
});

describe("SuggestionReviewBody: refresh offer on a stale suggestion", () => {
  it("offers Atualizar sugestão next to the stale notice when a refresh handler is given", () => {
    const html = renderToStaticMarkup(
      createElement(SuggestionReviewBody, {
        diff: { stale: true, changes: [CHANGED] },
        selection: initialSelection([CHANGED]),
        contentFormat: "markdown",
        onToggle: () => undefined,
        onRefresh: () => undefined,
      }),
    );

    expect(html).toContain("staleNotice");
    expect(html).toContain(">refresh<");
  });

  it("does not offer a refresh without a handler", () => {
    const html = render({ stale: true, changes: [CHANGED] });

    expect(html).toContain("staleNotice");
    expect(html).not.toContain(">refresh<");
  });
});
