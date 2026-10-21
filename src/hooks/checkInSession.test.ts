import { describe, expect, it } from "vitest";
import {
  ASKED_KEY,
  DISMISSED_KEY,
  SKIPPED_KEY,
  readAsked,
  readDismissed,
  readSkipped,
  writeAsked,
  writeDismissed,
  writeSkipped,
} from "./checkInSession";

function fakeStorage(seed: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

const throwingStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
} as unknown as Storage;

describe("check-in session memory", () => {
  it("the dismiss survives a reload of the same session", () => {
    const storage = fakeStorage();
    expect(readDismissed(storage)).toBe(false);
    writeDismissed(storage);
    expect(storage.getItem(DISMISSED_KEY)).toBe("1");
    expect(readDismissed(storage)).toBe(true);
  });

  it("remembers the tests the teacher has not applied yet", () => {
    const storage = fakeStorage();
    writeSkipped(["a", "b"], storage);
    expect(readSkipped(storage)).toEqual(["a", "b"]);
    expect(storage.getItem(SKIPPED_KEY)).toBe('["a","b"]');
  });

  it("ignores a corrupt skipped list", () => {
    expect(readSkipped(fakeStorage({ [SKIPPED_KEY]: "{not json" }))).toEqual([]);
    expect(readSkipped(fakeStorage({ [SKIPPED_KEY]: '{"a":1}' }))).toEqual([]);
  });

  it("remembers the lessons the strip has asked about, once each", () => {
    const storage = fakeStorage();
    expect(readAsked("a", storage)).toBe(false);
    writeAsked("a", storage);
    writeAsked("a", storage);
    writeAsked("b", storage);
    expect(storage.getItem(ASKED_KEY)).toBe('["a","b"]');
    expect(readAsked("a", storage)).toBe(true);
    expect(readAsked("c", storage)).toBe(false);
  });

  it("treats a corrupt asked list as empty and never throws when storage is unavailable", () => {
    expect(readAsked("a", fakeStorage({ [ASKED_KEY]: "{not json" }))).toBe(false);
    expect(() => writeAsked("a", fakeStorage({ [ASKED_KEY]: "{not json" }))).not.toThrow();
    expect(() => writeAsked("a", throwingStorage)).not.toThrow();
    expect(readAsked("a", throwingStorage)).toBe(false);
  });

  it("never throws when storage is unavailable", () => {
    expect(() => writeDismissed(throwingStorage)).not.toThrow();
    expect(readDismissed(throwingStorage)).toBe(false);
    expect(() => writeSkipped(["a"], throwingStorage)).not.toThrow();
    expect(readSkipped(throwingStorage)).toEqual([]);
    expect(readDismissed(null)).toBe(false);
  });
});
