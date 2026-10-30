/**
 * Suggestion banners the teacher hid with ✕, remembered in this browser by version id. Hiding never rejects the
 * suggestion: it stays under Versões. A refreshed suggestion is a new version, so its banner shows again.
 */
const KEY = "scooli.dismissedSuggestions";
const MAX = 50;

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isSuggestionDismissed(versionId: string): boolean {
  return read().includes(versionId);
}

export function dismissSuggestion(versionId: string): void {
  const ids = [...read().filter((id) => id !== versionId), versionId].slice(-MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // No storage (private window, blocked): the banner just comes back next time.
  }
}

/** Versões asks the document's suggestion bar to open the review, even when its banner is hidden. */
export const OPEN_SUGGESTION_REVIEW = "scooli:open-suggestion-review";

export function requestSuggestionReview(documentId: string): void {
  window.dispatchEvent(new CustomEvent(OPEN_SUGGESTION_REVIEW, { detail: { documentId } }));
}
