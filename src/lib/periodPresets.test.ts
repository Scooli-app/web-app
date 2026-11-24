import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/translate", () => ({
  translate: (key: string, values?: Record<string, string>) =>
    values?.range ? `${key}:${values.range}` : key,
}));

import {
  buildSchoolPeriodPresets,
  currentSchoolYearBase,
  periodKindFor,
  planningTypeFor,
  schoolYearLabelFor,
} from "./periodPresets";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe("school year base", () => {
  it("Portugal switches in September", () => {
    expect(currentSchoolYearBase("PT", day(2026, 8, 31))).toBe(2025);
    expect(currentSchoolYearBase("PT", day(2026, 9, 1))).toBe(2026);
    expect(schoolYearLabelFor("PT", day(2026, 11, 24))).toBe("2026/2027");
  });

  it("Brazil is the calendar year, planning the next one from December", () => {
    expect(currentSchoolYearBase("BR", day(2026, 11, 24))).toBe(2026);
    expect(currentSchoolYearBase("BR", day(2026, 12, 1))).toBe(2027);
    expect(schoolYearLabelFor("BR", day(2027, 3, 1))).toBe("2027");
  });
});

describe("buildSchoolPeriodPresets", () => {
  it("gives Brazil four bimestres, two semestres and a February-December year", () => {
    const presets = buildSchoolPeriodPresets("BR", day(2027, 3, 1));
    expect(presets.map((p) => p.label)).toEqual([
      "calendar.periods.bimester1",
      "calendar.periods.bimester2",
      "calendar.periods.bimester3",
      "calendar.periods.bimester4",
      "calendar.periods.semester1",
      "calendar.periods.semester2",
      "calendar.periods.schoolYear:2027",
    ]);
    expect(presets.at(-1)).toMatchObject({ start: "2027-02-02", end: "2027-12-18" });
  });

  it("keeps Portugal's three períodos from September to June", () => {
    const presets = buildSchoolPeriodPresets("PT", day(2026, 11, 24));
    expect(presets).toHaveLength(6);
    expect(presets[0]).toMatchObject({ label: "calendar.periods.term1", start: "2026-09-16" });
    expect(presets.at(-1)).toMatchObject({ start: "2026-09-16", end: "2027-06-19" });
  });
});

describe("periodKindFor", () => {
  it("reads every Brazilian preset as what it is called", () => {
    const kinds = buildSchoolPeriodPresets("BR", day(2027, 3, 1)).map((p) => periodKindFor(p.start, p.end, "BR"));
    expect(kinds).toEqual(["bimester", "bimester", "bimester", "bimester", "semester", "semester", "annual"]);
  });

  it("reads every Portuguese preset as its own planning type", () => {
    for (const preset of buildSchoolPeriodPresets("PT", day(2026, 11, 24))) {
      expect(planningTypeFor(periodKindFor(preset.start, preset.end, "PT"))).toBe(preset.planningType);
    }
  });

  it("handles typed-in dates and never calls a Portuguese period a bimestre", () => {
    expect(periodKindFor("2026-10-01", "2026-11-30", "PT")).toBe("trimester");
    expect(periodKindFor("2026-10-01", "2026-11-30", "BR")).toBe("bimester");
    expect(periodKindFor("2026-02-01", "2026-12-20", "BR")).toBe("annual");
    expect(periodKindFor("", "", "PT")).toBe("trimester");
  });

  it("gives a bimestre the finest detail level", () => {
    expect(planningTypeFor("bimester")).toBe("trimester");
    expect(planningTypeFor("annual")).toBe("annual");
  });
});
