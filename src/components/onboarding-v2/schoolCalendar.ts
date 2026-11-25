import type { CountryCode } from "@/lib/curriculum/countryCatalog";

/**
 * The school calendar as onboarding talks about it ("1.º período, semana 8"; which topics are usually taught by now).
 * Same dates as buildSchoolPeriodPresets (lib/periodPresets), computed from a given day so it can be tested.
 *
 * Portugal: 16 Sep → 19 Jun in three períodos. Brazil: 2 Feb → 18 Dec in four bimestres (the calendar year).
 */
const dayNumber = (date: Date) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
const at = (year: number, month: number, day: number) => dayNumber(new Date(year, month - 1, day));

/** Start year of the school year `today` belongs to. PT: from July on, the one about to start. BR: the calendar year. */
function schoolYearBase(today: Date, country: CountryCode): number {
  if (country === "BR") return today.getFullYear();
  return today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
}

function yearBounds(y: number, country: CountryCode): [number, number] {
  return country === "BR" ? [at(y, 2, 2), at(y, 12, 18)] : [at(y, 9, 16), at(y + 1, 6, 19)];
}

/** 0 before the year starts, 1 once it has ended, the share of days elapsed in between. */
export function schoolYearProgress(today: Date, country: CountryCode = "PT"): number {
  const [start, end] = yearBounds(schoolYearBase(today, country), country);
  return Math.min(1, Math.max(0, (dayNumber(today) - start) / (end - start)));
}

/** How many of a year's topics are usually taught by `today` (a suggestion the teacher corrects). */
export function suggestedTaughtCount(total: number, today: Date, country: CountryCode = "PT"): number {
  return Math.floor(total * schoolYearProgress(today, country));
}

/** The term (período in PT, bimestre in BR) and its week (1-based), or null in the holidays between terms. */
export function termAndWeek(today: Date, country: CountryCode = "PT"): { term: 1 | 2 | 3 | 4; week: number } | null {
  const y = schoolYearBase(today, country);
  const terms: [1 | 2 | 3 | 4, number, number][] =
    country === "BR"
      ? [
          [1, at(y, 2, 2), at(y, 4, 17)],
          [2, at(y, 4, 20), at(y, 7, 10)],
          [3, at(y, 7, 27), at(y, 10, 2)],
          [4, at(y, 10, 5), at(y, 12, 18)],
        ]
      : [
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
