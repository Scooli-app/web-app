import { describe, expect, it, vi } from "vitest";
import { classifyWeek, nextLessonAfter, retryFailedLessons } from "@/components/onboarding-v2/weekWork";

const slot = (id: string, status: string, over: Record<string, unknown> = {}) => ({
  id,
  status,
  slotType: "LESSON",
  topicTitle: "Frações",
  ...over,
});

describe("classifyWeek (F6)", () => {
  it("keeps the marker while every first-week lesson is failed", () => {
    const result = classifyWeek([slot("a", "failed"), slot("b", "failed")]);
    expect(result.failedIds).toEqual(["a", "b"]);
    expect(result.pendingIds).toEqual([]);
    expect(result.needsWork).toBe(true);
    expect(result.canClearMarker).toBe(false);
  });

  it("keeps the marker while any lesson is failed, pending or generating", () => {
    expect(classifyWeek([slot("a", "completed"), slot("b", "failed")]).canClearMarker).toBe(false);
    expect(classifyWeek([slot("a", "completed"), slot("b", "pending")]).canClearMarker).toBe(false);
    expect(classifyWeek([slot("a", "completed"), slot("b", "generating")]).canClearMarker).toBe(false);
  });

  it("clears only when everything is completed", () => {
    const result = classifyWeek([slot("a", "completed"), slot("b", "completed")]);
    expect(result.needsWork).toBe(false);
    expect(result.canClearMarker).toBe(true);
  });

  it("ignores holidays, skipped lessons and slots without a topic", () => {
    const result = classifyWeek([
      slot("a", "completed"),
      slot("h", "pending", { slotType: "HOLIDAY" }),
      slot("s", "skipped"),
      slot("n", "failed", { topicTitle: " " }),
    ]);
    expect(result.canClearMarker).toBe(true);
  });
});

describe("retryFailedLessons (F6)", () => {
  it("retries failed lessons one at a time, in order, and reports success", async () => {
    const order: string[] = [];
    let active = 0;
    let maxActive = 0;
    const generateOne = vi.fn(async (id: string) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      order.push(id);
      await new Promise((r) => setTimeout(r, 1));
      active -= 1;
      return true;
    });
    const result = await retryFailedLessons(["a", "b", "c"], generateOne);
    expect(order).toEqual(["a", "b", "c"]);
    expect(maxActive).toBe(1);
    expect(result).toEqual({ problem: false });
  });

  it("keeps going after a failure and reports a problem", async () => {
    const generateOne = vi.fn(async (id: string) => id !== "b");
    const result = await retryFailedLessons(["a", "b", "c"], generateOne);
    expect(generateOne).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ problem: true });
  });

  it("treats a thrown error as a failed lesson", async () => {
    const generateOne = vi.fn(async () => {
      throw new Error("network");
    });
    expect(await retryFailedLessons(["a"], generateOne)).toEqual({ problem: true });
  });

  it("stops early when told the limit was hit", async () => {
    const generateOne = vi.fn(async () => false);
    const result = await retryFailedLessons(["a", "b"], generateOne, { shouldStop: () => true });
    expect(generateOne).toHaveBeenCalledTimes(1);
    expect(result.problem).toBe(true);
  });
});

describe("nextLessonAfter", () => {
  const lesson = (id: string, slotDate: string, over: Record<string, unknown> = {}) => ({
    id,
    slotDate,
    slotType: "LESSON",
    status: "pending",
    topicTitle: "Frações",
    ...over,
  });

  it("takes the first lesson after the week's Sunday", () => {
    const slots = [
      lesson("c", "2026-11-18"),
      lesson("a", "2026-11-08"),
      lesson("b", "2026-11-09"),
    ];
    expect(nextLessonAfter(slots, "2026-11-02")?.id).toBe("b");
  });
  it("skips holidays, skipped lessons and lessons without a topic", () => {
    const slots = [
      lesson("h", "2026-11-09", { slotType: "HOLIDAY" }),
      lesson("s", "2026-11-10", { status: "skipped" }),
      lesson("t", "2026-11-11", { topicTitle: "" }),
      lesson("ok", "2026-11-12"),
    ];
    expect(nextLessonAfter(slots, "2026-11-02")?.id).toBe("ok");
  });
  it("is null when the class has no later lesson", () => {
    expect(nextLessonAfter([lesson("a", "2026-11-04")], "2026-11-02")).toBeNull();
  });
});
