import { describe, expect, it } from "vitest";
import reducer, {
  planGenerationStarted,
  planGenerationStoppedByLock,
  topicsStatusChanged,
} from "./planGenerationSlice";

describe("planGeneration: stopped by the read-only lock (ENG-321)", () => {
  it("leaves no failed state (no banner or retry next to the paywall) and asks pages to re-fetch", () => {
    let state = reducer(undefined, planGenerationStarted({ timetableId: "tt", weekStart: "2026-11-02" }));
    state = reducer(state, topicsStatusChanged({ status: "failed" }));
    expect(state.status).toBe("error");
    const before = state.refreshKey;

    state = reducer(state, planGenerationStoppedByLock());

    expect(state.status).toBe("idle");
    expect(state.error).toBeNull();
    expect(state.timetableId).toBeNull();
    expect(state.refreshKey).toBe(before + 1);
  });
});
