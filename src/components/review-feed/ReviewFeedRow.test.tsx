import type { ReviewItem } from "@/shared/types/review-feed";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewFeedRow } from "./ReviewFeedRow";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

function item(over: Partial<ReviewItem>): ReviewItem {
  return {
    kind: "topic_proposal",
    id: "p1",
    status: "pending",
    title: "Tema novo para a aula 2",
    summary: "A turma pediu mais prática.",
    createdAt: null,
    slotId: "slot-2",
    slotDate: "2026-10-23",
    sequenceNumber: 2,
    documentId: null,
    documentType: null,
    documentTitle: null,
    ...over,
  };
}

const render = (value: ReviewItem) =>
  renderToStaticMarkup(createElement(ReviewFeedRow, { item: value, locale: "pt-PT", onAction: () => undefined }));

describe("ReviewFeedRow", () => {
  it("shows the title, the lesson date and the muted summary", () => {
    const html = render(item({}));
    expect(html).toContain("Tema novo para a aula 2");
    expect(html).toMatch(/, 23\/10</);
    expect(html).toContain("A turma pediu mais prática.");
  });

  it("offers Rever for a topic proposal and a pending replan", () => {
    expect(render(item({}))).toContain(">review<");
    const replan = item({ kind: "replan", status: "pending", slotId: null, slotDate: null, sequenceNumber: null });
    expect(render(replan)).toContain(">review<");
  });

  it("shows the preparing text, not a button, while a replan generates", () => {
    const html = render(item({ kind: "replan", status: "generating", slotId: null, slotDate: null, sequenceNumber: null }));
    expect(html).toContain(">preparing<");
    expect(html).not.toContain("<button");
  });

  it("offers the old shift for a failed replan and a dismiss for no change", () => {
    const failed = item({ kind: "replan", status: "failed", slotId: null, slotDate: null, sequenceNumber: null });
    expect(render(failed)).toContain(">shiftFallback<");
    const noChange = item({ kind: "replan", status: "no_change", slotId: null, slotDate: null, sequenceNumber: null });
    expect(render(noChange)).toContain(">dismiss<");
  });

  it("shows no button for a topic proposal without a lesson", () => {
    expect(render(item({ slotId: null }))).not.toContain("<button");
  });
});
