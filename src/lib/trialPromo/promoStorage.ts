/**
 * The fair promo code (`?promo=FEIRA`, ENG-360) between the QR scan and the first signed-in page.
 *
 * Kept twice: in localStorage (`scooli_trial_promo`) and in a first-party cookie of the same name.
 * The cookie is what survives the trips Clerk's sign-up takes — Google/Microsoft SSO, the email
 * verification link opened in another tab, a browser that blocks localStorage — and the middleware
 * can set it server-side before any JS runs. Reads take the newer of the two copies.
 *
 * Edge-safe: the middleware imports the pure helpers; DOM access stays inside guarded functions.
 */

export const TRIAL_PROMO_STORAGE_KEY = "scooli_trial_promo";
export const TRIAL_PROMO_COOKIE_NAME = "scooli_trial_promo";
export const TRIAL_PROMO_QUERY_PARAM = "promo";
/** A captured code is forgotten 7 days after the scan. */
export const TRIAL_PROMO_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TRIAL_PROMO_COOKIE_MAX_AGE_S = TRIAL_PROMO_TTL_MS / 1000;

export interface StoredTrialPromo {
  code: string;
  /** Epoch ms of the (last) scan. */
  capturedAt: number;
  /** Apply calls that failed with a network/5xx/404 error so far. */
  attempts: number;
}

const CODE_PATTERN = /^[A-Z0-9_-]{2,32}$/;

/** Upper-cased, trimmed code; null for anything that cannot be a promo code. */
export function normalizePromoCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/**
 * The code on a URL's query: `?promo=` itself, or inside `redirect_url` — a signed-out visitor
 * sent to sign-in by the middleware or Clerk carries the original URL there.
 */
export function promoCodeFromSearch(search: string | URLSearchParams): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const direct = normalizePromoCode(params.get(TRIAL_PROMO_QUERY_PARAM));
  if (direct) return direct;
  const redirect = params.get("redirect_url");
  if (!redirect) return null;
  try {
    return normalizePromoCode(new URL(redirect, "https://app.invalid").searchParams.get(TRIAL_PROMO_QUERY_PARAM));
  } catch {
    return null;
  }
}

export function isPromoExpired(promo: StoredTrialPromo, now: number): boolean {
  return now - promo.capturedAt >= TRIAL_PROMO_TTL_MS;
}

function toPromo(code: unknown, capturedAt: unknown, attempts: unknown): StoredTrialPromo | null {
  const normalized = normalizePromoCode(code);
  const at = Number(capturedAt);
  const tries = Number(attempts);
  if (!normalized || !Number.isFinite(at) || at <= 0) return null;
  return { code: normalized, capturedAt: at, attempts: Number.isFinite(tries) && tries > 0 ? Math.floor(tries) : 0 };
}

/** Cookie value: `CODE.capturedAt.attempts` (the code alphabet has no dots). */
export function encodePromoCookie(promo: StoredTrialPromo): string {
  return `${promo.code}.${promo.capturedAt}.${promo.attempts}`;
}

export function parsePromoCookie(value: string | null | undefined): StoredTrialPromo | null {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const [code, capturedAt, attempts] = decoded.split(".");
  return toPromo(code, capturedAt, attempts ?? 0);
}

export function parsePromoJson(value: string | null | undefined): StoredTrialPromo | null {
  if (!value) return null;
  try {
    const raw = JSON.parse(value) as Partial<StoredTrialPromo> | null;
    return raw && typeof raw === "object" ? toPromo(raw.code, raw.capturedAt, raw.attempts) : null;
  } catch {
    return null;
  }
}

/** The newer of two copies; for the same scan, the one that counted more attempts. */
function newer(a: StoredTrialPromo | null, b: StoredTrialPromo | null): StoredTrialPromo | null {
  if (!a) return b;
  if (!b) return a;
  if (a.capturedAt !== b.capturedAt) return a.capturedAt > b.capturedAt ? a : b;
  return a.attempts >= b.attempts ? a : b;
}

// ---- Browser storage -------------------------------------------------------------------------

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TRIAL_PROMO_COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

function writeCookie(value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TRIAL_PROMO_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

/** The stored code, or null when there is none or it is older than 7 days (then it is cleared). */
export function readStoredPromo(now: number = Date.now()): StoredTrialPromo | null {
  let local: StoredTrialPromo | null = null;
  try {
    local = parsePromoJson(localStorage.getItem(TRIAL_PROMO_STORAGE_KEY));
  } catch {
    // Storage blocked: the cookie copy still works.
  }
  const promo = newer(local, parsePromoCookie(readCookie()));
  if (promo && isPromoExpired(promo, now)) {
    clearStoredPromo();
    return null;
  }
  return promo;
}

export function writeStoredPromo(promo: StoredTrialPromo, now: number = Date.now()): void {
  try {
    localStorage.setItem(TRIAL_PROMO_STORAGE_KEY, JSON.stringify(promo));
  } catch {
    // Private browsing or a blocked partition: the cookie carries it.
  }
  const remaining = Math.max(1, Math.ceil((promo.capturedAt + TRIAL_PROMO_TTL_MS - now) / 1000));
  writeCookie(encodePromoCookie(promo), remaining);
}

export function clearStoredPromo(): void {
  try {
    localStorage.removeItem(TRIAL_PROMO_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  writeCookie("", 0);
}

/**
 * Stores a code just read from the URL. Scanning the same code again refreshes its 7 days but keeps
 * the failed-attempt count, so reloading a `?promo=` URL cannot lift the retry cap.
 */
export function captureTrialPromo(code: string, now: number = Date.now()): StoredTrialPromo {
  const existing = readStoredPromo(now);
  const promo: StoredTrialPromo = {
    code,
    capturedAt: now,
    attempts: existing?.code === code ? existing.attempts : 0,
  };
  writeStoredPromo(promo, now);
  return promo;
}
