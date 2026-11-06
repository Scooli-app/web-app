import {
  clearStoredPromo,
  readStoredPromo,
  writeStoredPromo,
  type StoredTrialPromo,
} from "@/lib/trialPromo/promoStorage";
import { ApiRequestError } from "@/services/api/client";
import type { PlanLimits } from "@/shared/types/plan-limits";

/** Failed apply calls (network, 5xx, 404 before the backend ships) after which the code is dropped. */
export const TRIAL_PROMO_MAX_ATTEMPTS = 3;

export type TrialPromoApplyOutcome =
  /** No stored code. */
  | { kind: "none" }
  /** Limits unknown or not TRIAL yet: the code stays for the next plan-limits refresh. */
  | { kind: "waiting" }
  /** Another call is in flight (strict mode, a second mount, another tab), or this load already tried. */
  | { kind: "busy" }
  /** The trial already carries a promo: the stored code is dropped silently. */
  | { kind: "alreadyApplied"; code: string }
  | { kind: "applied"; code: string; limits: PlanLimits }
  /** A 403: not eligible, invalid, already used. Dropped silently. */
  | { kind: "refused"; code: string; reason: string }
  /** Network/5xx/404: kept for the next page load. */
  | { kind: "retryLater"; code: string; attempts: number }
  /** The last allowed attempt failed: dropped. */
  | { kind: "gaveUp"; code: string; attempts: number };

export interface TrialPromoStore {
  read: (now: number) => StoredTrialPromo | null;
  write: (promo: StoredTrialPromo, now: number) => void;
  clear: () => void;
}

export interface TrialPromoApplyDeps {
  apply: (code: string) => Promise<PlanLimits>;
  store?: TrialPromoStore;
  /** Runs `fn` only if no other tab is applying; resolves to null when another tab holds the lock. */
  lock?: <T>(fn: () => Promise<T>) => Promise<T | null>;
  now?: () => number;
}

const browserStore: TrialPromoStore = {
  read: (now) => readStoredPromo(now),
  write: (promo, now) => writeStoredPromo(promo, now),
  clear: () => clearStoredPromo(),
};

const LOCK_NAME = "scooli_trial_promo_apply";
const LEASE_KEY = "scooli_trial_promo_lock";
const LEASE_MS = 30_000;

/**
 * One tab at a time: the Web Locks API where available (released when the tab closes), else a
 * short localStorage lease. Without either (storage blocked) it just runs: the server is
 * idempotent for the same code, so a second call costs at most a second toast.
 */
export async function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T | null> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks && typeof locks.request === "function") {
    return locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => (lock ? fn() : null));
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const lease = JSON.parse(localStorage.getItem(LEASE_KEY) ?? "null") as { id?: string; until?: number } | null;
    if (lease && typeof lease.until === "number" && lease.until > Date.now()) return null;
    localStorage.setItem(LEASE_KEY, JSON.stringify({ id, until: Date.now() + LEASE_MS }));
  } catch {
    // No storage: run without a cross-tab lock.
  }
  try {
    return await fn();
  } finally {
    try {
      const lease = JSON.parse(localStorage.getItem(LEASE_KEY) ?? "null") as { id?: string } | null;
      if (lease?.id === id) localStorage.removeItem(LEASE_KEY);
    } catch {
      // Nothing to release.
    }
  }
}

// Per page load: one call in flight, and one call per code (a failure retries on the next load).
let inFlight = false;
const attemptedThisLoad = new Set<string>();

/** Test hook: a fresh "page load". */
export function resetTrialPromoApplyGuard() {
  inFlight = false;
  attemptedThisLoad.clear();
}

/**
 * Applies the stored promo code once the account is on its trial (ENG-360). Call it whenever
 * the plan limits change; it decides whether there is anything to do. Only the caller that started
 * the request gets the final outcome; concurrent callers get `busy`, so side effects (toast,
 * analytics) happen once.
 */
export async function maybeApplyTrialPromo(
  limits: PlanLimits | null,
  deps: TrialPromoApplyDeps,
): Promise<TrialPromoApplyOutcome> {
  const store = deps.store ?? browserStore;
  const now = deps.now ?? Date.now;
  const lock = deps.lock ?? withCrossTabLock;

  const stored = store.read(now());
  if (!stored) return { kind: "none" };
  if (!limits) return { kind: "waiting" };
  if (limits.trialPromoCode) {
    store.clear();
    return { kind: "alreadyApplied", code: stored.code };
  }
  if (limits.status !== "TRIAL") return { kind: "waiting" };
  if (inFlight || attemptedThisLoad.has(stored.code)) return { kind: "busy" };

  inFlight = true;
  try {
    const outcome = await lock(async (): Promise<TrialPromoApplyOutcome> => {
      // Another tab may have finished while this one waited.
      const current = store.read(now());
      if (!current) return { kind: "none" };
      attemptedThisLoad.add(current.code);
      try {
        const updated = await deps.apply(current.code);
        store.clear();
        return { kind: "applied", code: current.code, limits: updated };
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 403) {
          store.clear();
          return { kind: "refused", code: current.code, reason: error.code ?? "unknown" };
        }
        const attempts = current.attempts + 1;
        if (attempts >= TRIAL_PROMO_MAX_ATTEMPTS) {
          store.clear();
          return { kind: "gaveUp", code: current.code, attempts };
        }
        store.write({ ...current, attempts }, now());
        return { kind: "retryLater", code: current.code, attempts };
      }
    });
    return outcome ?? { kind: "busy" };
  } finally {
    inFlight = false;
  }
}
