import { describe, expect, it } from "vitest";
import { compactWeekLabel, defaultCalendarWeek, toIso } from "./calendar";

describe("defaultCalendarWeek", () => {
  it("opens on this week on a school day", () => {
    expect(toIso(defaultCalendarWeek(new Date(2026, 9, 14)))).toBe("2026-10-12"); // Wednesday
    expect(toIso(defaultCalendarWeek(new Date(2026, 9, 16)))).toBe("2026-10-12"); // Friday
  });

  it("opens on the coming week at the weekend", () => {
    expect(toIso(defaultCalendarWeek(new Date(2026, 9, 17)))).toBe("2026-10-19"); // Saturday
    expect(toIso(defaultCalendarWeek(new Date(2026, 9, 18)))).toBe("2026-10-19"); // Sunday
  });
});

describe("compactWeekLabel", () => {
  it("names the month once when the week stays in it", () => {
    expect(compactWeekLabel(new Date(2026, 9, 19), "pt-PT")).toBe("19–25 out");
  });

  it("names both months when the week crosses into the next", () => {
    expect(compactWeekLabel(new Date(2026, 8, 28), "pt-PT")).toBe("28 set – 4 out");
  });
});
