/**
 * The school calendar as onboarding talks about it ("1.º período, semana 8"; which topics are usually taught by now).
 * Same dates as buildSchoolPeriodPresets (lib/periodPresets), computed from a given day so it can be tested.
 */
const dayNumber = (date: Date) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
const at = (year: number, month: number, day: number) => dayNumber(new Date(year, month - 1, day));

/** Start year of the school year `today` belongs to; from July on, the one about to start. */
function schoolYearBase(today: Date): number {
  return today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
}

/** 0 before 16 Sep, 1 from 19 Jun, the share of days elapsed in between. */
export function schoolYearProgress(today: Date): number {
  const y = schoolYearBase(today);
  const start = at(y, 9, 16);
  const end = at(y + 1, 6, 19);
  return Math.min(1, Math.max(0, (dayNumber(today) - start) / (end - start)));
}

/** How many of a year's topics are usually taught by `today` (a suggestion the teacher corrects). */
export function suggestedTaughtCount(total: number, today: Date): number {
  return Math.floor(total * schoolYearProgress(today));
}

/** The term and its week (1-based), or null in the holidays between terms. */
export function termAndWeek(today: Date): { term: 1 | 2 | 3; week: number } | null {
  const y = schoolYearBase(today);
  const terms: [1 | 2 | 3, number, number][] = [
    [1, at(y, 9, 16), at(y, 12, 19)],
    [2, at(y + 1, 1, 6), at(y + 1, 3, 27)],
    [3, at(y + 1, 4, 14), at(y + 1, 6, 19)],
  ];
  const now = dayNumber(today);
  for (const [term, start, end] of terms) {
    if (now >= start && now <= end) return { term, week: Math.floor((now - start) / 7) + 1 };
  }
  return null;
}
