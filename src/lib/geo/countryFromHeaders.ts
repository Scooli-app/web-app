import {
  DEFAULT_COUNTRY_CODE,
  isCountryCode,
  type CountryCode,
} from "@/lib/curriculum/countryCatalog";

/** Geo headers set by the common edge providers, in priority order. */
export const GEO_COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
] as const;

/** Minimal header reader, so the helper works with `Headers` and plain objects in tests. */
export interface HeaderReader {
  get(name: string): string | null;
}

/**
 * Picks the visitor's country from the first geo header that names a supported
 * country. Unknown, unsupported or missing values (including Cloudflare's "XX"
 * and "T1") fall back to Portugal.
 */
export function countryFromGeoHeaders(headers: HeaderReader): CountryCode {
  for (const name of GEO_COUNTRY_HEADERS) {
    const raw = headers.get(name)?.trim().toUpperCase();
    if (raw && isCountryCode(raw)) return raw;
  }
  return DEFAULT_COUNTRY_CODE;
}
