import {
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_QUERY_PARAM,
  defaultLocale,
  detectBrowserLocale,
  isSupportedLocale,
  matchLocale,
  type Locale,
} from "./locales";
import {
  isContentLanguagePreference,
  isInterfaceLocalePreference,
  resolveContentLanguage,
  resolveInterfaceLocale,
  type ContentLanguagePreference,
  type InterfaceLocalePreference,
} from "./preferences";

/**
 * Browser-side reads and writes of the locale preference.
 *
 * Storage mirrors the theme's (`scooli-theme` in localStorage) so the two
 * preferences behave the same way, with one addition: the resolved interface
 * locale is also written to the `NEXT_LOCALE` cookie, because the server needs
 * it to pick the message bundle and the `<html lang>` before any JS runs.
 *
 * The absence of a stored value is meaningful. It means the teacher has never
 * expressed a preference, which is not the same as having chosen "follow my
 * browser" — see `readStoredInterfacePreference`.
 */

export const INTERFACE_LOCALE_STORAGE_KEY = "scooli-interface-locale";
export const CONTENT_LANGUAGE_STORAGE_KEY = "scooli-content-language";

export function readStoredInterfacePreference(): InterfaceLocalePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(INTERFACE_LOCALE_STORAGE_KEY);
    return isInterfaceLocalePreference(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function readStoredContentPreference(): ContentLanguagePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CONTENT_LANGUAGE_STORAGE_KEY);
    return isContentLanguagePreference(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * The interface locale a browser-side action should actually use — the same
 * "has this teacher ever expressed a preference" gate `LocaleProvider` applies
 * before it will trust `navigator.language`, extracted so anything resolving a
 * locale outside of React (a thunk, a service call) applies it identically.
 * Skipping this gate and calling `resolveInterfaceLocale` directly is the bug:
 * an account that never touched the setting must stay on `defaultLocale`, not
 * silently pick up whatever language the browser happens to report.
 */
export function resolveEffectiveInterfaceLocale(
  preference: InterfaceLocalePreference,
): Locale {
  const hasExpressedPreference = readStoredInterfacePreference() !== null;
  if (!hasExpressedPreference) return defaultLocale;
  return resolveInterfaceLocale(preference, detectBrowserLocale());
}

/** Same gate as {@link resolveEffectiveInterfaceLocale}, for the content-language preference used by AI generation requests. */
export function resolveEffectiveContentLanguage(
  contentPreference: ContentLanguagePreference,
  interfacePreference: InterfaceLocalePreference,
): Locale {
  return resolveContentLanguage(
    contentPreference,
    resolveEffectiveInterfaceLocale(interfacePreference),
  );
}

export function writeStoredInterfacePreference(
  preference: InterfaceLocalePreference,
): void {
  try {
    localStorage.setItem(INTERFACE_LOCALE_STORAGE_KEY, preference);
  } catch {
    // Private browsing or a blocked storage partition. The preference still
    // applies for this session via the cookie and Redux.
  }
}

export function writeStoredContentPreference(
  preference: ContentLanguagePreference,
): void {
  try {
    localStorage.setItem(CONTENT_LANGUAGE_STORAGE_KEY, preference);
  } catch {
    // See above.
  }
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]*)`),
  );
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  return isSupportedLocale(value) ? value : null;
}

/**
 * Written on the app's own host rather than `.scooli.app`, so it cannot clobber
 * the landing page's choice for a visitor who is browsing both. The handover is
 * one-directional by design: the landing page proposes, the app decides.
 */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * The locale a visitor arriving at sign-up should get, in decreasing order of
 * how deliberate the signal is:
 *
 *   1. `?locale=` on the URL — the landing page saying "this person was reading
 *      the English site, sign them up in English".
 *   2. The `NEXT_LOCALE` cookie — an earlier choice, here or on the landing page.
 *   3. The browser's own languages.
 *
 * Returns `null` when nothing says anything, so callers can fall back to the
 * registry default rather than guessing.
 */
export function resolveHandoverLocale(
  search?: string | URLSearchParams | null,
): Locale | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search)
      : search instanceof URLSearchParams
        ? search
        : typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;

  const fromQuery = matchLocale(params?.get(LOCALE_QUERY_PARAM));
  if (fromQuery) return fromQuery;

  const fromCookie = readLocaleCookie();
  if (fromCookie) return fromCookie;

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
