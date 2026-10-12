import { describe, expect, it } from "vitest";
import { addDaysIso, defaultWeekStart, isoWeekStart } from "@/shared/utils/week";

describe("defaultWeekStart", () => {
  it("shows this week when today is before the planning day and there is no free week", () => {
    // Wednesday 2026-10-14, planning day Friday (5)
    const today = new Date("2026-10-14T10:00:00");
    expect(defaultWeekStart(5, null, today)).toBe(isoWeekStart(today));
  });

  it("shows next week once today reaches the planning day and there is no free week", () => {
    // Friday 2026-10-16, planning day Friday (5)
    const today = new Date("2026-10-16T10:00:00");
    expect(defaultWeekStart(5, null, today)).toBe(addDaysIso(isoWeekStart(today), 7));
  });

  it("prefers the free week over the planning-day default when it is still current", () => {
    // Friday 2026-10-16: default planning day (7) would show THIS week (empty),
    // but the onboarding free week generated lessons for NEXT week.
    const today = new Date("2026-10-16T10:00:00");
    const thisWeek = isoWeekStart(today);
    const freeWeek = addDaysIso(thisWeek, 7);
    expect(defaultWeekStart(7, freeWeek, today)).toBe(freeWeek);
  });

  it("prefers the free week when it equals this week", () => {
    const today = new Date("2026-10-14T10:00:00");
    const thisWeek = isoWeekStart(today);
    expect(defaultWeekStart(7, thisWeek, today)).toBe(thisWeek);
  });

  it("ignores a free week that is already in the past", () => {
    // Friday 2026-10-16, planning day 7 (Sunday): falls back to "this week" since the
    // free week from last week no longer applies.
    const today = new Date("2026-10-16T10:00:00");
    const thisWeek = isoWeekStart(today);
    const pastFreeWeek = addDaysIso(thisWeek, -7);
    expect(defaultWeekStart(7, pastFreeWeek, today)).toBe(thisWeek);
  });

  it("falls back to planning day 7 when planningDay is null/undefined", () => {
    const today = new Date("2026-10-16T10:00:00"); // Friday, weekday 5
    const thisWeek = isoWeekStart(today);
    expect(defaultWeekStart(null, null, today)).toBe(thisWeek);
    expect(defaultWeekStart(undefined, null, today)).toBe(thisWeek);
  });
});
