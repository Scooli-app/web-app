import type { ReviewItem } from "@/shared/types/review-feed";
import { describe, expect, it } from "vitest";
import {
  REVIEW_VISIBLE_ROWS,
  documentReviewHref,
  lessonDateLabel,
  reviewAction,
  visibleReviewItems,
  withoutDismissed,
} from "./reviewFeedLogic";

function item(over: Partial<ReviewItem>): ReviewItem {
  return {
    kind: "topic_proposal",
    id: "p1",
    status: "pending",
    title: "Tema novo para a aula 2",
    summary: null,
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

describe("visibleReviewItems", () => {
  const items = [1, 2, 3, 4, 5].map((n) => item({ id: `p${n}` }));

  it("shows the first three until expanded", () => {
    expect(REVIEW_VISIBLE_ROWS).toBe(3);
    expect(visibleReviewItems(items, false).map((i) => i.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("shows every row once expanded", () => {
    expect(visibleReviewItems(items, true)).toHaveLength(5);
  });
});

describe("reviewAction", () => {
  it("replan: pending opens the review, generating only shows progress, failed shifts, no_change dismisses", () => {
    const replan = { kind: "replan" as const, slotId: null, slotDate: null, sequenceNumber: null };
    expect(reviewAction(item({ ...replan, status: "pending" }))).toEqual({ kind: "openReplan" });
    expect(reviewAction(item({ ...replan, status: "generating" }))).toEqual({ kind: "generating" });
    expect(reviewAction(item({ ...replan, status: "failed" }))).toEqual({ kind: "shiftFallback" });
    expect(reviewAction(item({ ...replan, status: "no_change" }))).toEqual({ kind: "dismiss" });
  });

  it("document suggestion: a ready version opens its editor on the review sheet", () => {
    const doc = item({
      kind: "document_suggestion",
      id: "v1",
      status: "pending",
      documentId: "d1",
      documentType: "worksheet",
    });
    expect(reviewAction(doc)).toEqual({ kind: "openDocument", href: "/worksheet/d1?review=1" });
  });

  it("document suggestion being revised shows progress", () => {
    const revising = item({ kind: "document_suggestion", status: "generating", documentId: "d1", documentType: "test" });
    expect(reviewAction(revising)).toEqual({ kind: "generating" });
  });

  it("topic proposal opens its lesson", () => {
    expect(reviewAction(item({ slotId: "slot-9" }))).toEqual({ kind: "openLesson", slotId: "slot-9" });
  });

  it("topic proposal without a lesson has nothing to act on", () => {
    expect(reviewAction(item({ slotId: null }))).toEqual({ kind: "none" });
  });
});

describe("documentReviewHref", () => {
  it("maps each document type to its editor", () => {
    expect(documentReviewHref("lessonPlan", "d1")).toBe("/lesson-plan/d1?review=1");
    expect(documentReviewHref("curriculumPlan", "d1")).toBe("/curriculum-plan/d1?review=1");
  });

  it("falls back to the documents list for an unknown type", () => {
    expect(documentReviewHref(null, "d1")).toBe("/documents/d1?review=1");
    expect(documentReviewHref("unknownType", "d1")).toBe("/documents/d1?review=1");
  });
});

describe("lessonDateLabel", () => {
  it("reads as a short weekday and day/month", () => {
    expect(lessonDateLabel("2026-10-23", "pt-PT")).toMatch(/^\p{L}+, 23\/10$/u);
  });

  it("is null without a date", () => {
    expect(lessonDateLabel(null, "pt-PT")).toBeNull();
    expect(lessonDateLabel("not-a-date", "pt-PT")).toBeNull();
  });
});

describe("withoutDismissed", () => {
  it("hides a dismissed replan and keeps the other items", () => {
    const replan = item({ kind: "replan", id: "r1", status: "no_change", slotId: null, slotDate: null, sequenceNumber: null });
    const topic = item({ id: "r1" });
    const kept = withoutDismissed([replan, topic], ["r1"]);
    expect(kept).toEqual([topic]);
  });
});
