import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import type {
  OnboardingV2DraftAnswers,
  OnboardingV2DraftPatch,
} from "@/shared/types/onboarding-v2";

/**
 * Autosave of the onboarding answers. Module-level so it survives step changes and can be
 * flushed on page hide. Failures are silent: the unsent values stay pending and go out
 * with the next change. Once `lockDrafts()` is called (Concluir) nothing is ever sent
 * again, so a late draft can't overwrite the completed state.
 */
const DEBOUNCE_MS = 600;

type Patch = OnboardingV2DraftPatch;

let pending: Patch | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let chain: Promise<void> = Promise.resolve();
let locked = false;
let lastSent: Record<string, string> = {};
let tokenGetter: (() => Promise<string | null>) | null = null;
let cachedToken: string | null = null;


/** Drops fields the server already has; null when nothing new would be sent. */
function prune(raw: Patch): Patch | null {
  const out: Record<string, unknown> = {};
  let changed = false;
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (lastSent[key] !== JSON.stringify(value)) {
      out[key] = value;
      if (key !== "step") changed = true;
    }
  }
  if (!changed && !("step" in out)) return null;
  out.step = raw.step;
  return out as unknown as Patch;
}

function record(patch: Patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) lastSent[key] = JSON.stringify(value);
  }
}

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

export function refreshDraftToken() {
  tokenGetter?.()
    .then((token) => {
      if (token) cachedToken = token;
    })
    .catch(() => undefined);
}

/** Called when a flow mounts: unlocks and seeds what the server already holds. */
export function resetDraft(
  getToken: () => Promise<string | null>,
  seed: Partial<OnboardingV2DraftAnswers> | null,
  step: number | null,
) {
  clearTimer();
  pending = null;
  locked = false;
  lastSent = {};
  tokenGetter = getToken;
  if (step) lastSent.step = JSON.stringify(step);
  for (const [key, value] of Object.entries(seed ?? {})) {
    if (value !== null && value !== undefined) lastSent[key] = JSON.stringify(value);
  }
  refreshDraftToken();
}

export function queueDraft(patch: Patch, options: { immediate?: boolean } = {}) {
  if (locked) return;
  pending = { ...(pending ?? {}), ...patch };
  clearTimer();
  if (options.immediate) {
    void flushDraft();
    return;
  }
  refreshDraftToken();
  timer = setTimeout(() => void flushDraft(), DEBOUNCE_MS);
}

export function flushDraft(): Promise<void> {
  clearTimer();
  if (locked || !pending) return chain;
  const raw = pending;
  pending = null;
  chain = chain.then(async () => {
    if (locked) return;
    const patch = prune(raw);
    if (!patch) return;
    try {
      await onboardingV2Service.saveDraft(patch);
      record(patch);
    } catch {
      if (!locked) pending = { ...raw, ...(pending ?? {}) };
    }
  });
  return chain;
}

/** Page hide: send what is pending without waiting for the debounce. */
export function flushDraftKeepalive() {
  clearTimer();
  if (locked || !pending) return;
  const patch = prune(pending);
  pending = null;
  if (!patch) return;
  if (cachedToken) {
    record(patch);
    void onboardingV2Service.saveDraftKeepalive(patch, cachedToken);
  } else {
    void onboardingV2Service.saveDraft(patch).then(() => record(patch)).catch(() => undefined);
  }
}

/** Concluir pressed: drop pending drafts, wait for any in flight, send nothing more. */
export function lockDrafts(): Promise<void> {
  locked = true;
  clearTimer();
  pending = null;
  return chain;
}

export function unlockDrafts() {
  locked = false;
}

export const isDraftLocked = () => locked;
