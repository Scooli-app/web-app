import { describe, expect, it } from "vitest";
import { isAtEnd, scrollTopToShow } from "./useFollowGeneration";

describe("isAtEnd", () => {
  it("allows a little slack at the end", () => {
    expect(isAtEnd({ scrollTop: 560, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
    expect(isAtEnd({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
    expect(isAtEnd({ scrollTop: 400, scrollHeight: 1000, clientHeight: 400 })).toBe(false);
  });
});

describe("scrollTopToShow", () => {
  const scroller = { scrollTop: 1000, top: 0, height: 800 };

  it("leaves an element that is already in full view where it is", () => {
    expect(scrollTopToShow(scroller, { top: 200, height: 300 })).toBeNull();
  });

  it("centres an element below the view", () => {
    // 1000 + 900 - (800 - 200) / 2
    expect(scrollTopToShow(scroller, { top: 900, height: 200 })).toBe(1600);
  });

  it("centres an element above the view, and hidden under the status bar counts as out of view", () => {
    expect(scrollTopToShow(scroller, { top: -500, height: 200 })).toBe(200);
    expect(scrollTopToShow(scroller, { top: 40, height: 200 })).toBe(740);
  });

  it("puts a tall element just below the status bar, never above the top", () => {
    expect(scrollTopToShow(scroller, { top: 900, height: 1200 })).toBe(1804);
    expect(scrollTopToShow({ scrollTop: 0, top: 0, height: 800 }, { top: -50, height: 100 })).toBe(0);
  });
});
