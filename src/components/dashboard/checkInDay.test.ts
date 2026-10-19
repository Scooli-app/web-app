import { describe, expect, it } from "vitest";
import { relativeDayLabel, type RelativeDayLabels } from "./checkInDay";

const labels: RelativeDayLabels = {
  today: "hoje",
  yesterday: "ontem",
  daysAgo: (count) => `há ${count} dias`,
};

describe("relativeDayLabel", () => {
  const today = "2026-10-19";

  it("words the last week relatively", () => {
    expect(relativeDayLabel("2026-10-19", today, "pt-PT", labels)).toBe("hoje");
    expect(relativeDayLabel("2026-10-18", today, "pt-PT", labels)).toBe("ontem");
    expect(relativeDayLabel("2026-10-16", today, "pt-PT", labels)).toBe("há 3 dias");
    expect(relativeDayLabel("2026-10-13", today, "pt-PT", labels)).toBe("há 6 dias");
  });

  it("falls back to the weekday once it is a week old", () => {
    // 2026-10-12 is a Monday.
    expect(relativeDayLabel("2026-10-12", today, "en-US", labels)).toBe("Monday");
  });
});
