/**
 * Per-tab memory for dismissed "no change" proposals (sessionStorage), keyed by proposal id.
 * Every access is wrapped: storage can be blocked, and then the alert simply shows again on reload.
 */

export const DISMISSED_PROPOSALS_KEY = "scooli.replan.dismissedProposals";

function safeSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Proposal ids the teacher dismissed in this session. */
export function readDismissedProposals(storage: Storage | null = safeSessionStorage()): string[] {
  try {
    const raw = storage?.getItem(DISMISSED_PROPOSALS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Remembers one dismissed proposal id for this session. Returns the full list written. */
export function writeDismissedProposal(id: string, storage: Storage | null = safeSessionStorage()): string[] {
  const next = [...new Set([...readDismissedProposals(storage), id])];
  try {
    storage?.setItem(DISMISSED_PROPOSALS_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal: the alert comes back on reload */
  }
  return next;
}
