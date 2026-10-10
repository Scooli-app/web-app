import type { PlanLimits } from "@/shared/types/plan-limits";

/** Free plan: 28 days from the Monday of the first class's start, inclusive. */
const WINDOW_DAYS = 28;

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function mondayOf(iso: string): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return toIso(d);
}

function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export interface PeriodBounds {
  /** Earliest allowed date (YYYY-MM-DD), or null when not constrained yet. */
  min: string | null;
  /** Latest allowed date (YYYY-MM-DD, inclusive), or null when not known yet. */
  max: string | null;
}

/**
 * The dates a free user's class may span. With no class yet there is no stored window:
 * it will start on the Monday of this class's start, so the end bound follows `start`.
 * Pro users (and unknown limits) have no bounds.
 */
export function freePeriodBounds(limits: PlanLimits | null, start?: string): PeriodBounds {
  if (!limits || limits.isPro) return { min: null, max: null };
  if (limits.windowStart && limits.windowEnd) {
    return { min: limits.windowStart, max: limits.windowEnd };
  }
  if (start) return { min: null, max: addDays(mondayOf(start), WINDOW_DAYS - 1) };
  return { min: null, max: null };
}

/** Pulls a period inside the free window; returns it unchanged when nothing applies. */
export function clampPeriodToFreeWindow(
  limits: PlanLimits | null,
  start: string,
  end: string
): { start: string; end: string } {
  if (!start || !end) return { start, end };
  let { min, max } = freePeriodBounds(limits, start);
  if (!min && !max) return { start, end };
  let s = min && start < min ? min : start;
  if (max && s > max) s = max;
  // An end before the (clamped) start stays a valid single-bound range.
  ({ min, max } = freePeriodBounds(limits, s));
  let e = max && end > max ? max : end;
  if (e < s) e = s;
  return { start: s, end: e };
}
