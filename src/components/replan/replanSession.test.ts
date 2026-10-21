import { describe, expect, it } from "vitest";
import { DISMISSED_PROPOSALS_KEY, readDismissedProposals, writeDismissedProposal } from "./replanSession";

/** An in-memory Storage stand-in. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
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

describe("dismissed no-change proposals", () => {
  it("remembers each dismissed proposal id for the session, once", () => {
    const storage = memoryStorage();
    expect(readDismissedProposals(storage)).toEqual([]);
    writeDismissedProposal("p1", storage);
    expect(writeDismissedProposal("p2", storage)).toEqual(["p1", "p2"]);
    expect(writeDismissedProposal("p1", storage)).toEqual(["p1", "p2"]);
    expect(JSON.parse(storage.getItem(DISMISSED_PROPOSALS_KEY) ?? "[]")).toEqual(["p1", "p2"]);
  });

  it("ignores a stored value that is not a list of ids", () => {
    const storage = memoryStorage();
    storage.setItem(DISMISSED_PROPOSALS_KEY, '{"oops":true}');
    expect(readDismissedProposals(storage)).toEqual([]);
    storage.setItem(DISMISSED_PROPOSALS_KEY, "not json");
    expect(readDismissedProposals(storage)).toEqual([]);
  });

  it("does not throw when session storage is blocked", () => {
    expect(readDismissedProposals(throwingStorage)).toEqual([]);
    expect(writeDismissedProposal("p1", throwingStorage)).toEqual(["p1"]);
  });
});
