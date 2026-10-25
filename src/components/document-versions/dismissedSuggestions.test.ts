// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { dismissSuggestion, isSuggestionDismissed } from "./dismissedSuggestions";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("dismissed suggestion banners", () => {
  it("hides the dismissed suggestion only", () => {
    dismissSuggestion("a");

    expect(isSuggestionDismissed("a")).toBe(true);
    expect(isSuggestionDismissed("b")).toBe(false);
  });

  // A refreshed suggestion is a new version: its banner shows again.
  it("keeps the last 50 ids, oldest dropped", () => {
    for (let i = 0; i < 51; i++) dismissSuggestion(`v${i}`);

    expect(isSuggestionDismissed("v0")).toBe(false);
    expect(isSuggestionDismissed("v1")).toBe(true);
    expect(isSuggestionDismissed("v50")).toBe(true);
  });

  it("never throws and never hides without storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => dismissSuggestion("a")).not.toThrow();
    expect(isSuggestionDismissed("a")).toBe(false);
  });
});
