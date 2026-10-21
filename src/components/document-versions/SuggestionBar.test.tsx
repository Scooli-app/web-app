import type { PendingSuggestion } from "@/shared/types/document-versions";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SuggestionBar } from "./SuggestionBar";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key, useLocale: () => "pt-PT" }));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => vi.fn() }));
vi.mock("@/store/documents/documentSlice", () => ({ documentRefreshed: (payload: unknown) => payload }));
vi.mock("@/services/api/document.service", () => ({ getDocument: vi.fn() }));
vi.mock("@/services/api/document-versions.service", () => ({
  getSuggestionDiff: vi.fn(),
  applySuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/document-editor-v2/SlideThumbnail", () => ({ SlideThumbnail: () => null }));

function suggestion(over: Partial<PendingSuggestion> = {}): PendingSuggestion {
  return {
    versionId: "v1",
    createdAt: "2026-10-21T10:00:00Z",
    reason: { summary: "A aula de 21/10 não aconteceu; esta aula passa a incluir a parte que faltou." },
    stale: false,
    status: "ready",
    ...over,
  };
}

function bar(s: PendingSuggestion | null | undefined) {
  return renderToStaticMarkup(
    createElement(SuggestionBar, { documentId: "d1", suggestion: s, contentFormat: "markdown" }),
  );
}

describe("SuggestionBar", () => {
  it("renders nothing when there is no pending suggestion", () => {
    expect(bar(null)).toBe("");
    expect(bar(undefined)).toBe("");
  });

  it("shows the title, the reason and the review action when the suggestion is ready", () => {
    const html = bar(suggestion());

    expect(html).toContain("title");
    expect(html).toContain("A aula de 21/10 não aconteceu");
    expect(html).toContain("review");
    expect(html).not.toContain("preparing");
  });

  it("shows the spinner and the preparing text while the suggestion is being written", () => {
    const html = bar(suggestion({ status: "generating" }));

    expect(html).toContain("preparing");
    expect(html).toContain("animate-spin");
    expect(html).not.toContain("review");
  });
});
