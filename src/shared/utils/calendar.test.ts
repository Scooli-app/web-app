import { describe, expect, it } from "vitest";
import { compactWeekLabel, defaultCalendarWeek, readableTextOn, toIso } from "./calendar";

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

describe("readableTextOn", () => {
  it("puts dark text on light turma colours and light text on dark ones", () => {
    expect(readableTextOn("#E9C46A")).toBe("#111827"); // yellow
    expect(readableTextOn("#8AB17D")).toBe("#111827"); // light green
    expect(readableTextOn("#264653")).toBe("#ffffff"); // dark teal
    expect(readableTextOn("#7F77DD")).toBe("#ffffff"); // Scooli violet
  });

  it("falls back to white for a colour it can't read", () => {
    expect(readableTextOn("not-a-colour")).toBe("#ffffff");
  });
});
