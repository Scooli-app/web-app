import { describe, expect, it } from "vitest";
import {
  schoolYearProgress,
  suggestedTaughtCount,
  termAndWeek,
} from "@/components/onboarding-v2/schoolCalendar";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 15, 30);

describe("schoolYearProgress (16 Sep → 19 Jun)", () => {
  it("is 0 before the year starts, including the summer before it", () => {
    expect(schoolYearProgress(day(2026, 9, 1))).toBe(0);
    expect(schoolYearProgress(day(2026, 9, 16))).toBe(0);
    expect(schoolYearProgress(day(2027, 7, 20))).toBe(0);
  });
  it("is 1 once the year has ended", () => {
    expect(schoolYearProgress(day(2027, 6, 19))).toBe(1);
    expect(schoolYearProgress(day(2027, 6, 30))).toBe(1);
  });
  it("is the share of days elapsed in between", () => {
    expect(schoolYearProgress(day(2026, 11, 5))).toBeCloseTo(50 / 276, 5);
  });
});

describe("suggestedTaughtCount", () => {
  it("rounds down the share of the topics usually taught by the date", () => {
    expect(suggestedTaughtCount(10, day(2026, 11, 5))).toBe(1);
    expect(suggestedTaughtCount(10, day(2027, 6, 1))).toBe(9);
    expect(suggestedTaughtCount(10, day(2026, 9, 10))).toBe(0);
    expect(suggestedTaughtCount(0, day(2027, 3, 1))).toBe(0);
  });
});

describe("termAndWeek", () => {
  it("gives the term and its week", () => {
    expect(termAndWeek(day(2026, 11, 5))).toEqual({ term: 1, week: 8 });
    expect(termAndWeek(day(2027, 1, 10))).toEqual({ term: 2, week: 1 });
    expect(termAndWeek(day(2027, 4, 14))).toEqual({ term: 3, week: 1 });
  });
  it("is null in the holidays between terms", () => {
    expect(termAndWeek(day(2026, 12, 23))).toBeNull();
    expect(termAndWeek(day(2027, 7, 15))).toBeNull();
  });
});
