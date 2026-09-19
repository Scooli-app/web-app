/**
 * The app's locale registry. Mirrors `SupportedLocale` in the backend and the
 * identical registry in the landing page repo (`src/i18n/routing.ts`) — all three
 * must agree, because a locale chosen here is persisted on the user row
 * (`preferred_locale` / `content_language`) and read back by the email and
 * generation layers.
 *
 * Codes are BCP-47 tags, not ISO-639 language codes: `pt-PT`, not `pt`. The
 * backend enum uses the tag form and rejects anything else.
 *
 * Adding a language: one entry in `locales`, one `messages/{locale}.json`, and one
 * entry in `LOCALE_LABELS` / `DATE_FNS_LOCALE_BY_LOCALE`.
 */
export const locales = ["pt-PT", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-PT";

/**
 * Handed over from the landing page, which writes it when a visitor picks a
 * language there. Same name next-intl uses by default, so the two repos share
 * the cookie on `.scooli.app` without extra plumbing.
 */
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

/** Query parameter the landing page appends when it links into sign-up. */
export const LOCALE_QUERY_PARAM = "locale";

/** One year — the same lifetime next-intl uses for its own locale cookie. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Language names are written in their own language, never translated. A reader
 * looking for their language recognises "English", not "Inglês".
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  "pt-PT": "Português",
  en: "English",
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Resolves an arbitrary language tag to a supported locale.
 *
 * Matching is on the primary subtag, so `pt-BR` and `pt` both resolve to `pt-PT`
 * and `en-GB` to `en`. A Brazilian teacher gets Portuguese rather than being
 * bounced to English on a region mismatch.
 *
 * Returns `null` — not the default — when nothing matches, so callers can tell
 * "no preference expressed" apart from "explicitly chose Portuguese". That
 * distinction is the whole point of the nullable backend columns.
 */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return null;

  const exact = locales.find((locale) => locale.toLowerCase() === normalized);
  if (exact) return exact;

  const primary = normalized.split("-")[0];
  const byPrimary = locales.find(
    (locale) => locale.toLowerCase().split("-")[0] === primary,
  );
  return byPrimary ?? null;
}

/**
 * Best guess at the visitor's language from the browser, used only when no
 * explicit preference exists. `navigator.languages` is ordered by preference,
 * so the first supported entry wins.
 */
export function detectBrowserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const candidates =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const candidate of candidates) {
    const matched = matchLocale(candidate);
    if (matched) return matched;
  }
  return null;
}
