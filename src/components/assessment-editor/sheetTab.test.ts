// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialSheetTab, readSheetTab, rememberSheetTab } from "./sheetTab";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("initialSheetTab", () => {
  it("opens a teacher's first document on the answers", () => {
    expect(initialSheetTab(null, 0)).toBe("answers");
  });

  it("keeps the tab the teacher last used", () => {
    expect(initialSheetTab("student", 0)).toBe("student");
    expect(initialSheetTab("answers", 0)).toBe("answers");
  });

  // "Por verificar" marks only show with the answers: a teacher must not miss them.
  it("opens on the answers while answers still need checking", () => {
    expect(initialSheetTab("student", 2)).toBe("answers");
  });
});

describe("remembered tab", () => {
  it("reads back what was remembered", () => {
    rememberSheetTab("student");
    expect(readSheetTab()).toBe("student");
  });

  it("ignores anything that isn't a tab", () => {
    window.localStorage.setItem("scooli.assessmentSheetTab", "teacher");
    expect(readSheetTab()).toBeNull();
  });

  it("never throws without storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => rememberSheetTab("student")).not.toThrow();
    expect(readSheetTab()).toBeNull();
  });
});
