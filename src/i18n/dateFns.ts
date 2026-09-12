"use client";

import { enGB, pt } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import { useLocale } from "next-intl";
import { defaultLocale, isSupportedLocale, type Locale } from "./locales";

/**
 * date-fns locales, keyed by our registry.
 *
 * `enGB` rather than `enUS`: everything else on screen is European — day/month
 * order, 24-hour clocks, Monday as the first day of the week — and an English
 * interface used by teachers in Portugal should not suddenly start writing dates
 * the American way round.
 */
const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  "pt-PT": pt,
  en: enGB,
};

export function getDateFnsLocale(locale: Locale): DateFnsLocale {
  return DATE_FNS_LOCALES[locale] ?? DATE_FNS_LOCALES[defaultLocale];
}

/**
 * The date-fns locale matching the interface language. Pass the result straight
 * into `format`, `formatDistanceToNow` and friends.
 */
export function useDateFnsLocale(): DateFnsLocale {
  const locale = useLocale();
  return getDateFnsLocale(isSupportedLocale(locale) ? locale : defaultLocale);
}
