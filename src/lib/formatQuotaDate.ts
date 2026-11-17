import { toIntlLocale } from "@/shared/utils/calendar";
import type { Locale } from "@/i18n/locales";

/**
 * "1 de dezembro" / "1 December" for a quota renewal instant. Read in UTC: the backend's windows end at UTC
 * midnight, which in a negative offset would otherwise show the day before. Uses the page's language, since
 * this also runs outside React (the API client).
 */
export function formatQuotaDate(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const lang = locale ?? (typeof document !== "undefined" ? document.documentElement.lang : "pt-PT");
  return date.toLocaleDateString(toIntlLocale(lang as Locale), { day: "numeric", month: "long", timeZone: "UTC" });
}
