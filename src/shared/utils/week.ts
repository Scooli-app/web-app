/** Returns the date as YYYY-MM-DD using local time (not UTC). */
export function localIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the ISO week-start (Monday) for the given date using local time. */
export function isoWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun … 6=Sat
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return localIsoDate(d);
}

/** Adds whole days to a YYYY-MM-DD date and returns YYYY-MM-DD. */
export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}

/** ISO weekday of the date: 1 (Mon) – 7 (Sun). */
export function isoWeekday(date: Date = new Date()): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

/**
 * Week shown by default: next week once today reaches the planning day, otherwise this
 * week — UNLESS the teacher's onboarding free week (the week lessons were actually
 * generated for, from `PlanLimits.freeWeekStart`) is still current or upcoming, in which
 * case that week wins. The free week follows its own fixed rule (this week Mon–Thu,
 * otherwise next Monday — see `onboardingFreeWeek`/`FreePlanRules.onboardingFreeWeek`)
 * which disagrees with the planning-day rule on some weekdays (e.g. default planning day
 * 7 shows "this week" on Fri/Sat while the free week generated lessons for next week).
 * Once the free week is in the past it stops overriding so normal planning-day behaviour
 * resumes for every later week.
 */
export function defaultWeekStart(
  planningDay: number | null | undefined,
  freeWeekStart?: string | null,
  today: Date = new Date(),
): string {
  const thisWeek = isoWeekStart(today);
  if (freeWeekStart && freeWeekStart >= thisWeek) {
    return freeWeekStart;
  }
  return isoWeekday(today) >= (planningDay ?? 7) ? addDaysIso(thisWeek, 7) : thisWeek;
}
