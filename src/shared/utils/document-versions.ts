import type { PendingSuggestion } from "@/shared/types/document-suggestions";
import type {
  DocumentVersionKind,
  DocumentVersionSummary,
} from "@/shared/types/document-versions";

/** Keys of `editor.documentVersions.kind` in the message files. */
export type DocumentVersionLabelKey =
  | "generated"
  | "aiEdit"
  | "teacherEdit"
  | "aiSuggestion"
  | "suggestionApplied"
  | "restored";

const LABEL_KEY_BY_KIND: Record<DocumentVersionKind, DocumentVersionLabelKey> = {
  generated: "generated",
  ai_edit: "aiEdit",
  teacher_edit: "teacherEdit",
  ai_suggestion: "aiSuggestion",
  suggestion_applied: "suggestionApplied",
  restored: "restored",
};

/**
 * Label key for a version row. An applied suggestion always reads as
 * "Sugestão aplicada", whatever kind the backend stored it under.
 */
export function versionLabelKey(version: DocumentVersionSummary): DocumentVersionLabelKey {
  if (version.status === "applied") return "suggestionApplied";
  return LABEL_KEY_BY_KIND[version.kind];
}

/**
 * Suggestions belong to the suggestions flow (T7), not here: open, dismissed and applied ones alike. An applied
 * suggestion is listed through its `suggestion_applied` row instead.
 */
export function isListedVersion(version: DocumentVersionSummary): boolean {
  return version.kind !== "ai_suggestion";
}

/** The list shown in the sheet: newest first, without any suggestion row. */
export function listedVersions(versions: DocumentVersionSummary[]): DocumentVersionSummary[] {
  return versions
    .filter(isListedVersion)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

/**
 * The row at the top of Versões for the document's suggestion (its banner can be hidden): the review when it is
 * ready, a note while it is being rewritten, nothing when there is none to review (e.g. Class State off).
 */
export function versionsSuggestionRow(pending: PendingSuggestion | null | undefined): "review" | "preparing" | null {
  if (!pending) return null;
  return pending.status === "ready" ? "review" : "preparing";
}

/** The current version is already what the editor shows, so it cannot be restored. */
export function canRestoreVersion(version: DocumentVersionSummary): boolean {
  return version.status !== "current";
}
