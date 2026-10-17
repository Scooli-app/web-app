import { describe, expect, it, vi } from "vitest";
import { createPlanLimitsCache } from "./planLimitsCache";

describe("createPlanLimitsCache", () => {
  it("asks the server once per signed-in user", async () => {
    const fetcher = vi.fn().mockResolvedValue({ isPro: true });
    const cache = createPlanLimitsCache(fetcher);

    await cache.get("user-a");
    await cache.get("user-a");

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("asks again when another account signs in, without a reload", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ isPro: true }).mockResolvedValueOnce({ isPro: false });
    const cache = createPlanLimitsCache(fetcher);

    expect(await cache.get("pro-teacher")).toEqual({ isPro: true });
    expect(await cache.get("free-teacher")).toEqual({ isPro: false });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("asks again after an invalidation, and after a failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue({ isPro: false });
    const cache = createPlanLimitsCache(fetcher);

    expect(await cache.get("u")).toBeNull();
    expect(await cache.get("u")).toEqual({ isPro: false });
    cache.invalidate();
    await cache.get("u");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
