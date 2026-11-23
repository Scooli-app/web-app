import type { Locale } from "./locales";

/**
 * Regional message overlays: the same interface language, worded for the
 * teacher's country.
 *
 * A Brazilian teacher who picks "Português" keeps the `pt-PT` locale (the
 * backend registry, the stored preference, dates and numbers are unchanged), but
 * reads Brazilian Portuguese: "você" instead of "tu", "arquivo" instead of
 * "ficheiro", and BNCC instead of the Portuguese Aprendizagens Essenciais. The
 * country, not the language picker, decides this, the same way it decides which
 * curriculum and which prompt pack the backend uses.
 *
 * The overlay is merged over the base catalogue, so a key missing from it
 * falls back to the base text instead of showing a raw key.
 */

/**
 * Written by `CountryMessagesSync` once the profile has loaded, read by
 * `request.ts` to pick the overlay. Holds an ISO country code ("PT", "BR").
 */
export const COUNTRY_COOKIE_NAME = "scooli-country";

/** One year, like the locale cookie. */
export const COUNTRY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Overlay file under `messages/`, per base locale and country. */
const OVERLAYS: Partial<Record<Locale, Record<string, string>>> = {
  "pt-PT": { BR: "pt-BR" },
};

/** The overlay catalogue name for this locale and country, or null for none. */
export function regionalOverlayFor(
  locale: Locale,
  country: string | null | undefined,
): string | null {
  if (!country) return null;
  return OVERLAYS[locale]?.[country.toUpperCase()] ?? null;
}

type Catalogue = Record<string, unknown>;

function isPlainObject(value: unknown): value is Catalogue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameShape(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b);
  return typeof a === typeof b;
}

/**
 * Deep merge: overlay values replace base values; base keys absent from the
 * overlay stay. Arrays (suggestion lists) are replaced whole, never merged by index.
 */
export function mergeCatalogues<T extends Catalogue>(base: T, overlay: Catalogue): T {
  const out: Catalogue = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = out[key];
    if (isPlainObject(value) && isPlainObject(current)) {
      out[key] = mergeCatalogues(current, value);
    } else if (sameShape(value, current)) {
      // Only take a value with the base's shape: a stray object where the base
      // has a string (or the reverse) would break `t()` for that key.
      out[key] = value;
    }
  }
  return out as T;
}
