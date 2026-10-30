/**
 * Document versions: review and apply a pending suggested version (ENG-255).
 */

import type { ApplySuggestionResult, DocumentVersionDiff } from "@/shared/types/document-suggestions";
import apiClient from "./client";

export async function getSuggestionDiff(
  documentId: string,
  versionId: string,
): Promise<DocumentVersionDiff> {
  const response = await apiClient.get<DocumentVersionDiff>(
    `/documents/${documentId}/versions/${versionId}/diff`,
  );
  return response.data;
}

/** `sectionKeys` null applies every section of the suggestion. */
export async function applySuggestion(
  documentId: string,
  versionId: string,
  sectionKeys: string[] | null,
): Promise<ApplySuggestionResult> {
  const response = await apiClient.post<ApplySuggestionResult>(
    `/documents/${documentId}/versions/${versionId}/apply`,
    { sectionKeys },
  );
  return response.data;
}

export async function rejectSuggestion(documentId: string, versionId: string): Promise<void> {
  await apiClient.post(`/documents/${documentId}/versions/${versionId}/reject`);
}

/** Asks the backend to write the suggestion again from the current document. Returns 202 while it generates. */
export async function refreshSuggestion(documentId: string, versionId: string): Promise<void> {
  await apiClient.post(`/documents/${documentId}/versions/${versionId}/refresh`);
}
