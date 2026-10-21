/**
 * Suggested document versions (ENG-255). A lesson document can carry one pending suggestion that the
 * teacher reviews section by section before it is applied or rejected.
 */

import type { Document } from "./document";

export type PendingSuggestionStatus = "generating" | "ready";

export interface PendingSuggestionReason {
  /** pt-PT sentence explaining why the suggestion exists. */
  summary: string;
}

export interface PendingSuggestion {
  versionId: string;
  createdAt: string;
  reason: PendingSuggestionReason | null;
  /** The teacher edited the document after the suggestion was made. */
  stale: boolean;
  status: PendingSuggestionStatus;
}

export type SectionChangeType = "added" | "removed" | "changed" | "unchanged";

export interface SectionChange {
  key: string;
  type: SectionChangeType;
  /** Null only for the `_title` pseudo change, which is labelled by the UI. */
  title: string | null;
  /** Markdown section, or slide JSON for presentations. Null when the section is new. */
  before: string | null;
  /** Markdown section, or slide JSON for presentations. Null when the section was removed. */
  after: string | null;
  position: number;
}

export interface DocumentVersionDiff {
  stale: boolean;
  /** The presentation's format changed since the suggestion was made (e.g. v1 blocks became a canvas). */
  formatChanged?: boolean;
  changes: SectionChange[];
}

export interface ApplySuggestionResult {
  document: Document;
  /** Section keys that no longer exist in the document and were left out. */
  skipped: string[];
}
