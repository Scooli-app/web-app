import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/translate", () => ({ translate: (key: string) => key }));

import { getBrazilianSchoolHolidays, getSchoolHolidays } from "./schoolHolidays";
import { getPortugueseHolidays } from "./portugueseHolidays";
import { expandSlotsLocally } from "@/lib/timetable/planToTimetable";

describe("getSchoolHolidays", () => {
  it("gives Brazil its own national holidays and none of Portugal's", () => {
    const br = getSchoolHolidays("BR", 2026, 2026);
    for (const day of ["2026-04-21", "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-15", "2026-11-20"]) {
      expect(br.has(day), day).toBe(true);
    }
    for (const day of ["2026-10-05", "2026-04-25", "2026-06-10", "2026-12-01", "2026-12-08"]) {
      expect(br.has(day), day).toBe(false);
    }
  });

  it("follows Easter for Carnaval, Sexta-feira Santa and Corpus Christi (Easter 2026 is 5 April)", () => {
    const br = getBrazilianSchoolHolidays(2026, 2026);
    expect(["2026-02-16", "2026-02-17", "2026-04-03", "2026-06-04"].every((d) => br.has(d))).toBe(true);
  });

  it("includes the July recess, like the backend calendar", () => {
    const br = getBrazilianSchoolHolidays(2026, 2026);
    expect(br.has("2026-07-15")).toBe(true);
    expect(br.has("2026-07-31")).toBe(true);
    expect(br.has("2026-07-14")).toBe(false);
  });

  it("keeps Portugal's list for every other teacher", () => {
    expect(getSchoolHolidays("PT", 2026, 2027)).toEqual(getPortugueseHolidays(2026, 2027));
    expect(getSchoolHolidays(undefined, 2026, 2026)).toEqual(getPortugueseHolidays(2026, 2026));
  });
});

describe("expandSlotsLocally", () => {
  // Mondays only, so every Monday in the period is one slot.
  const mondays = [{ dayOfWeek: 1, position: 1, durationMinutes: 50 }];
  const typeOn = (slots: { date: string; slotType: string }[], date: string) =>
    slots.find((s) => s.date === date)?.slotType;

  it("marks Brazilian holidays for a Brazilian teacher (seen live: 5 October was a holiday, 2 November a lesson)", () => {
    const slots = expandSlotsLocally("2026-10-05", "2026-11-02", mondays, "BR");
    expect(typeOn(slots, "2026-10-05")).toBe("LESSON");
    expect(typeOn(slots, "2026-10-12")).toBe("HOLIDAY");
    expect(typeOn(slots, "2026-11-02")).toBe("HOLIDAY");
  });

  it("keeps Portugal's holidays by default", () => {
    const slots = expandSlotsLocally("2026-10-05", "2026-11-02", mondays);
    expect(typeOn(slots, "2026-10-05")).toBe("HOLIDAY");
    expect(typeOn(slots, "2026-10-12")).toBe("LESSON");
    expect(typeOn(slots, "2026-11-02")).toBe("LESSON");
  });
});
