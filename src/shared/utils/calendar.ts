/** Shared date/calendar utilities used across calendar pages and components. */
import type { Locale } from "@/i18n/locales";

/**
 * BCP-47 tag to feed `Intl.DateTimeFormat` for each interface locale. `en-GB`
 * rather than `en` — day/month order and abbreviations should stay European,
 * matching the `enGB` choice in `src/i18n/dateFns.ts`.
 */
const INTL_LOCALE_BY_LOCALE: Record<Locale, string> = {
  "pt-PT": "pt-PT",
  en: "en-GB",
};

export function toIntlLocale(locale: Locale): string {
  return INTL_LOCALE_BY_LOCALE[locale] ?? "pt-PT";
}

/**
 * Format a Date as YYYY-MM-DD using local timezone components.
 * Never use `toISOString().slice(0,10)` — it converts to UTC which shifts
 * the date for users in UTC+ timezones (e.g. Portugal WEST = UTC+1 in summer).
 */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Returns the Monday of the week containing `date` (local time). */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekLabel(weekStart: Date, locale: Locale): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString(toIntlLocale(locale), { day: "numeric", month: "short" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  };
}

/**
 * Mon–Sun abbreviated day labels for the given interface locale. Built from a
 * known Monday (2024-01-01) via `Intl.DateTimeFormat` rather than hard-coded
 * strings, so it follows the interface language automatically.
 */
export function getDayLabels(locale: Locale): string[] {
  const fmt = new Intl.DateTimeFormat(toIntlLocale(locale), { weekday: "short" });
  const monday = new Date(2024, 0, 1); // a known Monday
  return Array.from({ length: 7 }, (_, i) => fmt.format(addDays(monday, i)));
}
