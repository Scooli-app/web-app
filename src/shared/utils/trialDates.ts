import type { Locale } from "@/i18n/locales";
import { toIntlLocale } from "@/shared/utils/calendar";

/** The trial's end as DD/MM ("termina a 04/12"); null when the date is missing or invalid. */
export function formatTrialEndDate(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(toIntlLocale(locale as Locale), { day: "2-digit", month: "2-digit" }).format(date);
}
