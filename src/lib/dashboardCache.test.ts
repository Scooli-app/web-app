import { afterEach, describe, expect, it, vi } from "vitest";
import { CACHE_KEYS, CACHE_TTL, dashboardCache } from "./dashboardCache";

const KEY = CACHE_KEYS.RECENT_DOCUMENTS;
const TTL = CACHE_TTL.RECENT_DOCUMENTS;

afterEach(() => {
  dashboardCache.clear();
  vi.useRealTimers();
});

describe("dashboardCache", () => {
  it("returns what was cached for the same user", () => {
    dashboardCache.set("user_a", KEY, ["doc-a"]);
    expect(dashboardCache.get("user_a", KEY, TTL)).toEqual(["doc-a"]);
  });

  it("never serves one user's data to another user", () => {
    dashboardCache.set("user_a", KEY, ["doc-a"]);
    expect(dashboardCache.get("user_b", KEY, TTL)).toBeNull();
  });

  it("drops the previous user's data once another user touches it", () => {
    dashboardCache.set("user_a", KEY, ["doc-a"]);
    dashboardCache.get("user_b", KEY, TTL);
    expect(dashboardCache.get("user_a", KEY, TTL)).toBeNull();
  });

  it("forgets everything on clear", () => {
    dashboardCache.set("user_a", KEY, ["doc-a"]);
    dashboardCache.clear();
    expect(dashboardCache.get("user_a", KEY, TTL)).toBeNull();
  });

  it("expires entries after the TTL", () => {
    vi.useFakeTimers();
    dashboardCache.set("user_a", KEY, ["doc-a"]);
    vi.advanceTimersByTime(TTL + 1);
    expect(dashboardCache.get("user_a", KEY, TTL)).toBeNull();
  });

  it("invalidates a single key", () => {
    dashboardCache.set("user_a", KEY, ["doc-a"]);
    dashboardCache.set("user_a", CACHE_KEYS.UPCOMING_LESSONS, ["lesson"]);
    dashboardCache.invalidate(KEY);
    expect(dashboardCache.get("user_a", KEY, TTL)).toBeNull();
    expect(
      dashboardCache.get("user_a", CACHE_KEYS.UPCOMING_LESSONS, CACHE_TTL.UPCOMING_LESSONS),
    ).toEqual(["lesson"]);
  });
});
