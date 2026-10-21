/**
 * Version history of a document (ENG-254). Mirrors the chalkboard
 * `GET /documents/{id}/versions` contract.
 */

export type DocumentVersionKind =
  | "generated"
  | "ai_edit"
  | "teacher_edit"
  | "ai_suggestion"
  | "suggestion_applied"
  | "restored";

export type DocumentVersionStatus =
  | "current"
  | "superseded"
  | "suggested"
  | "rejected"
  | "applied";

export interface DocumentVersionSummary {
  id: string;
  versionNumber: number;
  kind: DocumentVersionKind;
  status: DocumentVersionStatus;
  title: string;
  /** ISO-8601 instant. */
  createdAt: string;
  createdBy: string | null;
  reason: string | null;
}

export interface DocumentVersionDetail extends DocumentVersionSummary {
  content: string;
  contentFormat: "markdown" | "json";
}
