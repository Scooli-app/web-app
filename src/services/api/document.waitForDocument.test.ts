import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("./client", () => ({ default: http }));

import { waitForDocument } from "./document.service";

const processing = { data: { id: "doc-1", status: "processing", content: "" } };

beforeEach(() => {
  http.get.mockReset();
  vi.useRealTimers();
});

describe("waitForDocument", () => {
  it("does not poll when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(waitForDocument("doc-1", 60, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(http.get).not.toHaveBeenCalled();
  });

  it("stops polling after the signal aborts", async () => {
    vi.useFakeTimers();
    http.get.mockResolvedValue(processing);
    const controller = new AbortController();
    const result = waitForDocument("doc-1", 60, controller.signal);
    const assertion = expect(result).rejects.toMatchObject({ name: "AbortError" });

    await vi.advanceTimersByTimeAsync(0);
    expect(http.get).toHaveBeenCalledTimes(1);
    controller.abort();
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
