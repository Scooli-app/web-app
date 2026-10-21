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

/** Suggestions still open or dismissed belong to the suggestions flow (T7), not here. */
export function isListedVersion(version: DocumentVersionSummary): boolean {
  return version.status !== "suggested" && version.status !== "rejected";
}

/** The list shown in the sheet: newest first, without suggestions that are still open or rejected. */
export function listedVersions(versions: DocumentVersionSummary[]): DocumentVersionSummary[] {
  return versions
    .filter(isListedVersion)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

/** The current version is already what the editor shows, so it cannot be restored. */
export function canRestoreVersion(version: DocumentVersionSummary): boolean {
  return version.status !== "current";
}
