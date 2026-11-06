export interface TrialDuration {
  unit: "months" | "days";
  count: number;
}

const DAYS_PER_MONTH = 30;

/**
 * Splits a trial length into what the copy says: whole 30-day multiples are months (60 → 2 months,
 * 30 → 1 month), anything else is days. Null for a length that is not a positive whole number.
 */
export function trialDuration(totalTrialDays: unknown): TrialDuration | null {
  if (typeof totalTrialDays !== "number" || !Number.isInteger(totalTrialDays) || totalTrialDays <= 0) return null;
  if (totalTrialDays % DAYS_PER_MONTH === 0) return { unit: "months", count: totalTrialDays / DAYS_PER_MONTH };
  return { unit: "days", count: totalTrialDays };
}
