/**
 * The day a past lesson happened, as the check-in strip words it: "hoje", "ontem",
 * "há 3 dias", or the weekday once it is a week old.
 */

export interface RelativeDayLabels {
  today: string;
  yesterday: string;
  daysAgo: (count: number) => string;
}

const DAY_MS = 86_400_000;

export function relativeDayLabel(
  slotDate: string,
  todayIso: string,
  locale: string,
  labels: RelativeDayLabels,
): string {
  const days = Math.round((Date.parse(`${todayIso}T00:00:00Z`) - Date.parse(`${slotDate}T00:00:00Z`)) / DAY_MS);
  if (days <= 0) return labels.today;
  if (days === 1) return labels.yesterday;
  if (days < 7) return labels.daysAgo(days);
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" })
    .format(new Date(`${slotDate}T00:00:00Z`))
    .replace(/\.$/, "");
}
