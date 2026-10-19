/**
 * Per-tab memory for the check-in strip: hidden for this session only (sessionStorage).
 * Every access is wrapped: storage can be blocked, and then the strip just comes back on reload.
 */

export const DISMISSED_KEY = "scooli.checkIns.dismissed";
export const SKIPPED_KEY = "scooli.checkIns.skipped";

export function readDismissed(storage: Storage | null = safeSessionStorage()): boolean {
  try {
    return storage?.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDismissed(storage: Storage | null = safeSessionStorage()): void {
  try {
    storage?.setItem(DISMISSED_KEY, "1");
  } catch {
    /* non-fatal: the strip stays hidden until the tab changes */
  }
}

/** Slot ids the teacher answered "Ainda não" for, in this session. */
export function readSkipped(storage: Storage | null = safeSessionStorage()): string[] {
  try {
    const raw = storage?.getItem(SKIPPED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeSkipped(slotIds: readonly string[], storage: Storage | null = safeSessionStorage()): void {
  try {
    storage?.setItem(SKIPPED_KEY, JSON.stringify(slotIds));
  } catch {
    /* non-fatal */
  }
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
