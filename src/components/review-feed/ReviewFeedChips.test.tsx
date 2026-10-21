import type { TurmaReviewCount } from "@/shared/types/review-feed";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewFeedChipsView } from "./ReviewFeedChipsView";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${values.count}` : key,
}));

const turma = (over: Partial<TurmaReviewCount> = {}): TurmaReviewCount => ({
  timetableId: "t1",
  turmaTitle: "9.º Português · B",
  count: 2,
  ...over,
});

describe("ReviewFeedChipsView", () => {
  it("renders one chip per turma with its count, linking to the turma's section", () => {
    const html = renderToStaticMarkup(
      createElement(ReviewFeedChipsView, { turmas: [turma(), turma({ timetableId: "t2", count: 1 })] }),
    );
    expect(html).toContain('href="/calendar/t1#por-rever"');
    expect(html).toContain('href="/calendar/t2#por-rever"');
    expect(html).toContain("chip:2");
    expect(html).toContain("chip:1");
    expect(html).toContain("9.º Português · B");
  });

  it("renders nothing when no turma waits", () => {
    expect(renderToStaticMarkup(createElement(ReviewFeedChipsView, { turmas: [] }))).toBe("");
  });
});
