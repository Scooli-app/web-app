import { describe, expect, it } from "vitest";
import {
  DISMISSED_KEY,
  SKIPPED_KEY,
  readDismissed,
  readSkipped,
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

  it("never throws when storage is unavailable", () => {
    expect(() => writeDismissed(throwingStorage)).not.toThrow();
    expect(readDismissed(throwingStorage)).toBe(false);
    expect(() => writeSkipped(["a"], throwingStorage)).not.toThrow();
    expect(readSkipped(throwingStorage)).toEqual([]);
    expect(readDismissed(null)).toBe(false);
  });
});
