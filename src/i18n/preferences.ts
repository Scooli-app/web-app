import { defaultLocale, isSupportedLocale, type Locale } from "./locales";

/**
 * The two locale preferences a teacher can set, modelled to match the backend's
 * two nullable user columns:
 *
 *   - `preferred_locale`  → interface language. `null` = follow the browser.
 *   - `content_language`  → language of AI-generated materials. `null` = same as
 *                            the interface.
 *
 * They are deliberately independent. A Portuguese teacher of English wants a
 * Portuguese interface and English worksheets, and `content_language` being null
 * means "same as interface", never "Portuguese".
 *
 * The sentinel values below are the UI's spelling of `null`. They exist so the
 * Redux state can be a plain string union — the same shape as `ThemeMode`'s
 * "system" — and are converted back to `null` on the way to the API.
 */

/** `"system"` mirrors `ThemeMode`'s third option: defer to the browser. */
export const FOLLOW_BROWSER = "system" as const;

/** Defer to whatever the interface language currently resolves to. */
export const SAME_AS_INTERFACE = "interface" as const;

export type InterfaceLocalePreference = Locale | typeof FOLLOW_BROWSER;

export type ContentLanguagePreference = Locale | typeof SAME_AS_INTERFACE;

export const DEFAULT_INTERFACE_LOCALE_PREFERENCE: InterfaceLocalePreference =
  FOLLOW_BROWSER;

export const DEFAULT_CONTENT_LANGUAGE_PREFERENCE: ContentLanguagePreference =
  SAME_AS_INTERFACE;

export function isInterfaceLocalePreference(
  value: unknown,
): value is InterfaceLocalePreference {
  return value === FOLLOW_BROWSER || isSupportedLocale(value);
}

export function isContentLanguagePreference(
  value: unknown,
): value is ContentLanguagePreference {
  return value === SAME_AS_INTERFACE || isSupportedLocale(value);
}

/** UI preference → the nullable value the backend stores. */
export function interfacePreferenceToApi(
  preference: InterfaceLocalePreference,
): Locale | null {
  return preference === FOLLOW_BROWSER ? null : preference;
}

export function contentPreferenceToApi(
  preference: ContentLanguagePreference,
): Locale | null {
  return preference === SAME_AS_INTERFACE ? null : preference;
}

/** The nullable value the backend stores → UI preference. */
export function interfacePreferenceFromApi(
  value: string | null | undefined,
): InterfaceLocalePreference {
  return isSupportedLocale(value) ? value : FOLLOW_BROWSER;
}

export function contentPreferenceFromApi(
  value: string | null | undefined,
): ContentLanguagePreference {
  return isSupportedLocale(value) ? value : SAME_AS_INTERFACE;
}

/**
 * The locale documents are actually generated in, once "same as interface" has
 * been followed through.
 */
export function resolveContentLanguage(
  preference: ContentLanguagePreference,
  interfaceLocale: Locale,
): Locale {
  return preference === SAME_AS_INTERFACE ? interfaceLocale : preference;
}

/**
 * The locale the interface is actually rendered in.
 *
 * `detected` is the browser's language, which is only consulted when the teacher
 * has not chosen one. When the browser is set to something we do not ship, we
 * fall back to Portuguese rather than English — the user base is Portuguese and
 * an unknown browser language is far more likely to be a Portuguese teacher with
 * an oddly configured machine than an English speaker.
 */
export function resolveInterfaceLocale(
  preference: InterfaceLocalePreference,
  detected: Locale | null,
): Locale {
  if (preference !== FOLLOW_BROWSER) return preference;
  return detected ?? defaultLocale;
}
