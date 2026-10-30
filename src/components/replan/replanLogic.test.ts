import type { ReplanItem, ReplanProposal } from "@/shared/types/replan";
import { describe, expect, it } from "vitest";
import {
  acceptPayload,
  bannerState,
  initialSelection,
  newOutcomes,
  pollUntilSettled,
  settledToast,
  timelineOrder,
} from "./replanLogic";

function item(slotId: string, overrides: Partial<ReplanItem> = {}): ReplanItem {
  return {
    slotId,
    date: "2026-10-20",
    sequenceNumber: 1,
    change: "retitled",
    before: { topicTitle: "Old", outcomeTexts: ["A"] },
    after: { topicTitle: "New", description: null, outcomeTexts: ["A", "B"] },
    addition: null,
    reason: null,
    hasDocuments: false,
    ...overrides,
  };
}

function proposal(status: ReplanProposal["status"], items: ReplanItem[] = []): ReplanProposal {
  return { id: "p1", status, trigger: "NOT_HELD", triggerSlotId: "s0", summary: null, createdAt: null, items };
}

describe("acceptPayload", () => {
  const items = [item("s1"), item("s2"), item("s3")];

  it("sends null when every change is checked", () => {
    expect(acceptPayload(items, initialSelection(items))).toBeNull();
  });

  it("sends only the checked lessons, in timeline order", () => {
    expect(acceptPayload(items, new Set(["s3", "s1"]))).toEqual(["s1", "s3"]);
  });

  it("sends an empty list when nothing is checked", () => {
    expect(acceptPayload(items, new Set())).toEqual([]);
  });
});

describe("newOutcomes", () => {
  it("returns only the outcomes the lesson did not have", () => {
    expect(newOutcomes(item("s1"))).toEqual(["B"]);
  });
});

describe("timelineOrder", () => {
  it("orders by date, then by sequence number", () => {
    const ordered = timelineOrder([
      item("late", { date: "2026-10-27", sequenceNumber: 3 }),
      item("same-day-second", { date: "2026-10-20", sequenceNumber: 2 }),
      item("first", { date: "2026-10-20", sequenceNumber: 1 }),
    ]);
    expect(ordered.map((i) => i.slotId)).toEqual(["first", "same-day-second", "late"]);
  });
});

describe("bannerState", () => {
  it("shows nothing without a proposal", () => {
    expect(bannerState(null)).toBeNull();
  });

  it("reports generating", () => {
    expect(bannerState(proposal("generating"))).toEqual({ kind: "generating" });
  });

  it("counts the pending changes", () => {
    expect(bannerState(proposal("pending", [item("s1"), item("s2")]))).toEqual({ kind: "pending", count: 2 });
  });

  it("keeps the trigger lesson on a failed proposal, for the old shift", () => {
    expect(bannerState(proposal("failed"))).toEqual({ kind: "failed", triggerSlotId: "s0" });
  });
});

describe("pollUntilSettled", () => {
  it("returns the first settled value", async () => {
    const values = [proposal("generating"), proposal("generating"), proposal("pending")];
    const result = await pollUntilSettled(
      async () => values.shift() ?? null,
      (p) => p !== null && p.status !== "generating",
      { intervalMs: 1, maxAttempts: 10, signal: new AbortController().signal },
    );
    expect(result?.status).toBe("pending");
  });

  it("stops calling load once aborted, and resolves undefined", async () => {
    const controller = new AbortController();
    let calls = 0;
    const pending = pollUntilSettled(
      async () => {
        calls += 1;
        if (calls === 2) controller.abort();
        return proposal("generating");
      },
      (p) => p !== null && p.status !== "generating",
      { intervalMs: 1000, maxAttempts: 60, signal: controller.signal },
    );
    expect(await pending).toBeUndefined();
    expect(calls).toBe(2);
  });

  it("gives up after maxAttempts", async () => {
    let calls = 0;
    const result = await pollUntilSettled(
      async () => {
        calls += 1;
        return null;
      },
      (p) => p !== null,
      { intervalMs: 1, maxAttempts: 3, signal: new AbortController().signal },
    );
    expect(result).toBeUndefined();
    expect(calls).toBe(3);
  });
});

describe("no_change proposals", () => {
  const base = { id: "p9", trigger: "NOT_HELD", triggerSlotId: "s1", createdAt: null, items: [] };

  it("the banner shows the summary and no actions", () => {
    expect(bannerState({ ...base, status: "no_change", summary: "Nothing to move." })).toEqual({
      kind: "noChange",
      summary: "Nothing to move.",
    });
  });

  it("a watch toasts info, not an error, when nothing needs to change", () => {
    expect(settledToast({ ...base, status: "no_change", summary: null })).toBe("noChange");
    expect(settledToast({ ...base, status: "pending", summary: null })).toBe("ready");
    expect(settledToast({ ...base, status: "failed", summary: null })).toBe("failed");
  });
});
