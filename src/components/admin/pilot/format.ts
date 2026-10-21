const percentFormatter = new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 0 });

/** A share as a percentage, or a dash when there is nothing to divide by. */
export function formatPercent(value: number | null): string {
  return value === null ? "—" : percentFormatter.format(value);
}

export function formatCount(value: number): string {
  return value.toLocaleString("pt-PT");
}

/** The short column label of an ISO week: `2026-W42` becomes `W42`. */
export function weekShortLabel(week: string): string {
  return week.slice(week.indexOf("-") + 1);
}

/** The Monday date of a week picker option, e.g. `13 out`. */
export function formatWeekDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}
