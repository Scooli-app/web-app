import { describe, expect, it } from "vitest";
import type { PreviewSlot } from "@/lib/timetable/planToTimetable";
import { allSelected, slotDayKey, slotIdsBetween, withSelection } from "./slotSelection";

const slot = (id: string, date: string): PreviewSlot => ({
  id,
  date,
  slotType: "LESSON",
  sequenceNumber: 1,
  durationMinutes: 50,
});

const slots = [
  slot("a", "2026-09-14"),
  slot("b", "2026-09-16"),
  slot("c", "2026-09-18"),
  slot("d", "2026-09-21"),
];

describe("slotIdsBetween", () => {
  it("returns the range in list order, whichever end comes first", () => {
    expect(slotIdsBetween(slots, "b", "d")).toEqual(["b", "c", "d"]);
    expect(slotIdsBetween(slots, "d", "b")).toEqual(["b", "c", "d"]);
  });

  it("falls back to the clicked slot when the anchor is gone", () => {
    expect(slotIdsBetween(slots, "removed", "c")).toEqual(["c"]);
  });
});

describe("withSelection", () => {
  it("adds or removes every id without changing the input set", () => {
    const start = new Set(["a"]);
    expect([...withSelection(start, ["b", "c"], true)]).toEqual(["a", "b", "c"]);
    expect([...withSelection(new Set(["a", "b", "c"]), ["a", "b"], false)]).toEqual(["c"]);
    expect([...start]).toEqual(["a"]);
  });
});

describe("allSelected", () => {
  it("is true only for a non-empty, fully selected group", () => {
    expect(allSelected(new Set(["a", "b"]), ["a", "b"])).toBe(true);
    expect(allSelected(new Set(["a"]), ["a", "b"])).toBe(false);
    expect(allSelected(new Set(["a"]), [])).toBe(false);
  });
});

describe("slotDayKey", () => {
  it("maps the slot date to its weekday", () => {
    expect(slots.map(slotDayKey)).toEqual(["mon", "wed", "fri", "mon"]);
    expect(slotDayKey(slot("e", "2026-09-20"))).toBe("sun");
  });
});
