import { describe, expect, it } from "vitest";
import {
  INITIAL_GENERATION_STATE,
  applyGenerationEvent,
  parseGenerationEvent,
  type GenerationState,
} from "./useGenerationProgress";

const run = (events: Array<[string, Record<string, unknown>]>, from: GenerationState = INITIAL_GENERATION_STATE) =>
  events.reduce((s, [type, payload]) => applyGenerationEvent(s, type, payload), from);

describe("parseGenerationEvent", () => {
  it("unwraps the backend envelope and parses JSON data", () => {
    const partial = { schemaVersion: 1, blocks: [{ id: "s1" }] };
    const data = JSON.stringify({ type: "partial", data: JSON.stringify(partial) });
    expect(parseGenerationEvent(undefined, data)).toEqual({ type: "partial", payload: partial });
  });

  it("keeps plain string data as _raw", () => {
    const data = JSON.stringify({ type: "status", data: "preparing" });
    expect(parseGenerationEvent(undefined, data)).toEqual({ type: "status", payload: { _raw: "preparing" } });
  });

  it("ignores data that is not JSON", () => {
    expect(parseGenerationEvent(undefined, "not json")).toBeNull();
  });
});

describe("applyGenerationEvent", () => {
  it("follows the phases and keeps the latest snapshot", () => {
    const first = { blocks: [{ id: "s1" }] };
    const second = { blocks: [{ id: "s1" }, { id: "s2" }] };
    const s = run([
      ["status", { phase: "generating" }],
      ["partial", first],
      ["partial", second],
      ["status", { phase: "reviewing" }],
    ]);
    expect(s.phase).toBe("reviewing");
    expect(s.partial).toBe(second);
  });

  it("drops the preview when the backend retries", () => {
    const s = run([
      ["status", { phase: "generating" }],
      ["partial", { sections: [{ items: [{ id: "e1" }] }] }],
      ["status", { phase: "retrying" }],
    ]);
    expect(s.partial).toBeNull();
    expect(s.phase).toBe("generating");
    expect(s.attempt).toBe(2);
  });

  it("ignores snapshots that are not documents and unknown phases", () => {
    const s = run([
      ["partial", { _raw: "oops" }],
      ["status", { _raw: "preparing" }],
      ["status", { phase: "whatever" }],
    ]);
    expect(s).toEqual(INITIAL_GENERATION_STATE);
  });

  it("tracks image progress and the images phase", () => {
    const s = run([
      ["status", { phase: "images" }],
      ["image_progress", { completed: 2, total: 5 }],
    ]);
    expect(s.phase).toBe("images");
    expect(s.imageProgress).toEqual({ completed: 2, total: 5 });
  });

  it("ends on done", () => {
    expect(run([["done", { documentId: "d1" }]]).phase).toBe("done");
  });
});
