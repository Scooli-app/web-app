/** "Por rever" items (ENG-257, API from ENG-303 backend `ReviewFeedResource` / `ReviewFeedSummaryResource`). */

/** Replanning proposal, a suggested document version (or a document being revised), or a topic proposal. */
export type ReviewKind = "replan" | "document_suggestion" | "topic_proposal";

/** `no_change` only for replan. A document being revised is `generating` and has no version yet. */
export type ReviewStatus = "pending" | "generating" | "failed" | "no_change";

export interface ReviewItem {
  kind: ReviewKind;
  /** The proposal id, the document version id, or the topic proposal id. A document being revised: the document id. */
  id: string;
  status: ReviewStatus;
  /** A short pt-PT line, shown as it is. */
  title: string;
  summary: string | null;
  createdAt: string | null;
  /** Null for a replan, which belongs to no lesson. */
  slotId: string | null;
  /** ISO date of the lesson ("2026-10-23"), or null. */
  slotDate: string | null;
  sequenceNumber: number | null;
  documentId: string | null;
  /** Document type as the backend names it (`lessonPlan`, `worksheet`, ...), or null. */
  documentType: string | null;
  documentTitle: string | null;
}

export interface ReviewItemsResponse {
  count: number;
  /** Replans first, then by lesson date. */
  items: ReviewItem[];
}

/** A turma with something waiting, for the dashboard chip. */
export interface TurmaReviewCount {
  timetableId: string;
  turmaTitle: string;
  count: number;
}
