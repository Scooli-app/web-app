// @vitest-environment jsdom
import { ApiRequestError } from "@/services/api/client";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRIAL_PROMO_MAX_ATTEMPTS,
  maybeApplyTrialPromo,
  resetTrialPromoApplyGuard,
  withCrossTabLock,
} from "./applyTrialPromo";
import { clearStoredPromo, readStoredPromo, writeStoredPromo } from "./promoStorage";

const NOW = Date.UTC(2026, 10, 14, 10, 0, 0);
const BASE: PlanLimits = {
  isPro: true,
  maxActiveClasses: null,
  activeClasses: 0,
  windowStart: null,
  windowEnd: null,
  freeWeekStart: null,
};
const TRIAL: PlanLimits = { ...BASE, status: "TRIAL", trialEndsAt: "2026-12-14T10:00:00Z", trialDaysLeft: 30, trialPromoCode: null };
const EXTENDED: PlanLimits = { ...TRIAL, trialEndsAt: "2027-01-13T10:00:00Z", trialDaysLeft: 60, trialPromoCode: "LIS2026" };

const now = () => NOW;
const noLock = <T,>(fn: () => Promise<T>) => fn();

function store(attempts = 0) {
  writeStoredPromo({ code: "LIS2026", capturedAt: NOW, attempts }, NOW);
}

beforeEach(() => {
  resetTrialPromoApplyGuard();
  localStorage.clear();
  clearStoredPromo();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("maybeApplyTrialPromo (ENG-360)", () => {
  it("does nothing without a stored code", async () => {
    const apply = vi.fn();
    expect(await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).toEqual({ kind: "none" });
    expect(apply).not.toHaveBeenCalled();
  });

  it("on 200 applies the code once, clears it and returns the new limits", async () => {
    store();
    const apply = vi.fn().mockResolvedValue(EXTENDED);
    const outcome = await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock });
    expect(outcome).toEqual({ kind: "applied", code: "LIS2026", limits: EXTENDED });
    expect(apply).toHaveBeenCalledWith("LIS2026");
    expect(readStoredPromo(NOW)).toBeNull();
  });

  it.each(["promo_not_eligible", "promo_invalid", "promo_already_used"])(
    "on 403 %s drops the code silently",
    async (code) => {
      store();
      const apply = vi.fn().mockRejectedValue(new ApiRequestError("no", 403, code));
      expect(await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).toEqual({
        kind: "refused",
        code: "LIS2026",
        reason: code,
      });
      expect(readStoredPromo(NOW)).toBeNull();
    },
  );

  it.each([
    ["a network error", new ApiRequestError("offline", 0, null)],
    ["a 5xx", new ApiRequestError("boom", 503, null)],
    ["a 404 (backend not deployed yet)", new ApiRequestError("not found", 404, null)],
  ])("on %s keeps the code with one more attempt", async (_label, error) => {
    store();
    const apply = vi.fn().mockRejectedValue(error);
    expect(await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).toEqual({
      kind: "retryLater",
      code: "LIS2026",
      attempts: 1,
    });
    expect(readStoredPromo(NOW)).toEqual({ code: "LIS2026", capturedAt: NOW, attempts: 1 });
  });

  it("retries on the next load only, and gives up after 3 failed attempts (no 404 spam)", async () => {
    store();
    const apply = vi.fn().mockRejectedValue(new ApiRequestError("not found", 404, null));

    expect((await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).kind).toBe("retryLater");
    // Same page load: a later plan-limits refresh does not call again.
    expect((await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).kind).toBe("busy");
    expect(apply).toHaveBeenCalledTimes(1);

    resetTrialPromoApplyGuard(); // next load
    expect(await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).toMatchObject({ kind: "retryLater", attempts: 2 });
    resetTrialPromoApplyGuard(); // next load
    expect(await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).toEqual({
      kind: "gaveUp",
      code: "LIS2026",
      attempts: TRIAL_PROMO_MAX_ATTEMPTS,
    });
    expect(readStoredPromo(NOW)).toBeNull();

    resetTrialPromoApplyGuard();
    expect((await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).kind).toBe("none");
    expect(apply).toHaveBeenCalledTimes(3);
  });

  it("waits, keeping the code, while the limits are unknown or the account is not on the trial yet", async () => {
    store();
    const apply = vi.fn().mockResolvedValue(EXTENDED);
    expect((await maybeApplyTrialPromo(null, { apply, now, lock: noLock })).kind).toBe("waiting");
    expect((await maybeApplyTrialPromo({ ...BASE, isPro: false, status: "LEGACY_FREE" }, { apply, now, lock: noLock })).kind).toBe(
      "waiting",
    );
    expect((await maybeApplyTrialPromo({ ...BASE, status: "PRO" }, { apply, now, lock: noLock })).kind).toBe("waiting");
    expect(apply).not.toHaveBeenCalled();
    expect(readStoredPromo(NOW)?.code).toBe("LIS2026");

    // The next refresh says TRIAL: now it applies.
    expect((await maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock })).kind).toBe("applied");
  });

  it("drops the code without a call when the trial already carries a promo", async () => {
    store();
    const apply = vi.fn();
    expect(await maybeApplyTrialPromo(EXTENDED, { apply, now, lock: noLock })).toEqual({ kind: "alreadyApplied", code: "LIS2026" });
    expect(apply).not.toHaveBeenCalled();
    expect(readStoredPromo(NOW)).toBeNull();
  });

  it("calls once under React strict mode's double effects: the second caller gets busy", async () => {
    store();
    const pending: { resolve?: (value: PlanLimits) => void } = {};
    const apply = vi.fn(() => new Promise<PlanLimits>((r) => (pending.resolve = r)));
    const first = maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock });
    const second = maybeApplyTrialPromo(TRIAL, { apply, now, lock: noLock });
    expect(await second).toEqual({ kind: "busy" });
    await Promise.resolve();
    pending.resolve?.(EXTENDED);
    expect((await first).kind).toBe("applied");
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("does not call while another tab holds the lock, and re-reads the code once it has the lock", async () => {
    store();
    const apply = vi.fn().mockResolvedValue(EXTENDED);
    const otherTabHolds = async () => null;
    expect(await maybeApplyTrialPromo(TRIAL, { apply, now, lock: otherTabHolds })).toEqual({ kind: "busy" });
    expect(apply).not.toHaveBeenCalled();

    // The other tab applied it meanwhile and cleared the code.
    const otherTabFinished = async <T,>(fn: () => Promise<T>) => {
      clearStoredPromo();
      return fn();
    };
    expect(await maybeApplyTrialPromo(TRIAL, { apply, now, lock: otherTabFinished })).toEqual({ kind: "none" });
    expect(apply).not.toHaveBeenCalled();
  });
});

describe("withCrossTabLock", () => {
  it("uses the Web Locks API when available, and skips when the lock is taken", async () => {
    const request = vi.fn(async (_name: string, _opts: unknown, cb: (lock: unknown) => Promise<unknown>) => cb(null));
    vi.stubGlobal("navigator", { ...navigator, locks: { request } });
    const fn = vi.fn().mockResolvedValue("ran");
    expect(await withCrossTabLock(fn)).toBeNull();
    expect(fn).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith("scooli_trial_promo_apply", { ifAvailable: true }, expect.any(Function));

    request.mockImplementation(async (_n, _o, cb) => cb({ name: "scooli_trial_promo_apply" }));
    expect(await withCrossTabLock(fn)).toBe("ran");
  });

  it("falls back to a localStorage lease: a second tab is refused while the first runs", async () => {
    const held: { release?: () => void } = {};
    const first = withCrossTabLock(() => new Promise<string>((r) => (held.release = () => r("first"))));
    const second = await withCrossTabLock(async () => "second");
    expect(second).toBeNull();
    held.release?.();
    expect(await first).toBe("first");
    // Released: the next caller runs.
    expect(await withCrossTabLock(async () => "third")).toBe("third");
  });
});
