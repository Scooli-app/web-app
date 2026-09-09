/**
 * Module-level singleton that the Planificações/Turmas flows call whenever the
 * user completes a "value moment" (a planificação finished generating, a lesson
 * plan was produced, "Gerar semana" finished, topics were generated).
 *
 * `FeatureFeedbackGate` listens and, a couple of seconds later, decides whether
 * to show the small feedback card — see that component for the full criteria.
 *
 * The cumulative completion count is persisted in localStorage so the
 * "has generated enough to have an opinion" check survives reloads/sessions.
 */

const COUNT_KEY = "scooli.featureFeedback.completions";

type Listener = (completionCount: number) => void;

const _listeners = new Set<Listener>();

function readCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(COUNT_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeCount(n: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COUNT_KEY, String(n));
  } catch {
    // ignore (private mode, quota, etc.) — the gate just won't fire from count alone
  }
}

export const featureFeedbackTrigger = {
  /** Call after a Planificações/Turmas generation completes successfully. */
  notifyCompletion(): void {
    const next = readCount() + 1;
    writeCount(next);
    _listeners.forEach((l) => l(next));
  },

  /** How many feature completions this user has racked up (persisted). */
  completionCount(): number {
    return readCount();
  },

  /** Subscribe to completion events. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
