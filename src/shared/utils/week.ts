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

/** Week shown by default: next week once today reaches the planning day, otherwise this week. */
export function defaultWeekStart(planningDay: number | null | undefined, today: Date = new Date()): string {
  const thisWeek = isoWeekStart(today);
  return isoWeekday(today) >= (planningDay ?? 7) ? addDaysIso(thisWeek, 7) : thisWeek;
}
