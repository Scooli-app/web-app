/**
 * Per-tab memory for the check-in strip: hidden for this session only (sessionStorage).
 * Every access is wrapped: storage can be blocked, and then the strip just comes back on reload.
 */

export const DISMISSED_KEY = "scooli.checkIns.dismissed";
export const SKIPPED_KEY = "scooli.checkIns.skipped";
/** Slot ids the check-in strip has asked about in this session (shown, answered or not). */
export const ASKED_KEY = "scooli.checkIns.asked";

/** Sent by "Ver" on the "Confirma N aulas" next step: the strip comes back and scrolls into view. */
export const SHOW_CHECK_INS_EVENT = "scooli:show-check-ins";

/** Sent by the strip after it saves check-ins or starts a follow-up: "O que fazer a seguir" reloads its steps. */
export const CHECK_INS_CHANGED_EVENT = "scooli:check-ins-changed";

/**
 * Sent by the strip with how many lessons it still asks about: after "Ainda não" that is fewer than the server's
 * count, and "Confirma N aulas" follows it. Kept here too, for a card that mounts after the event.
 */
export const CHECK_INS_VISIBLE_EVENT = "scooli:check-ins-visible";
let visibleCheckIns: number | null = null;
export const lastVisibleCheckIns = () => visibleCheckIns;
export function announceVisibleCheckIns(count: number | null): void {
  visibleCheckIns = count;
  window.dispatchEvent(new Event(CHECK_INS_VISIBLE_EVENT));
}

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

export function clearDismissed(storage: Storage | null = safeSessionStorage()): void {
  try {
    storage?.removeItem(DISMISSED_KEY);
  } catch {
    /* non-fatal */
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

/** Whether the strip has already asked about this lesson in this session. */
export function readAsked(slotId: string, storage: Storage | null = safeSessionStorage()): boolean {
  try {
    const raw = storage?.getItem(ASKED_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.includes(slotId);
  } catch {
    return false;
  }
}

export function writeAsked(slotId: string, storage: Storage | null = safeSessionStorage()): void {
  try {
    const raw = storage?.getItem(ASKED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const asked = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    if (!asked.includes(slotId)) storage?.setItem(ASKED_KEY, JSON.stringify([...asked, slotId]));
  } catch {
    /* non-fatal: the dialog may ask once more in this session */
  }
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
