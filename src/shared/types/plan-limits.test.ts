import { describe, expect, it } from "vitest";
import {
  isAccountLockedPayload,
  lockUpgradeReason,
  parsePlanLimits,
  resolveAccountAccess,
  type PlanLimits,
} from "./plan-limits";

const OLD_FREE: PlanLimits = {
  isPro: false,
  maxActiveClasses: 1,
  activeClasses: 1,
  windowStart: "2026-09-01",
  windowEnd: "2026-09-29",
  freeWeekStart: null,
};

describe("parsePlanLimits (ENG-320)", () => {
  it("reads a response without status (old backend) as LEGACY_FREE or PRO from isPro, never locked or offering a trial", () => {
    expect(parsePlanLimits(OLD_FREE)).toEqual({
      ...OLD_FREE,
      status: "LEGACY_FREE",
      trialStartedAt: null,
      trialEndsAt: null,
      trialDaysLeft: null,
      canStartTrial: false,
      lockReason: null,
      trialPromoCode: null,
    });
    expect(parsePlanLimits({ ...OLD_FREE, isPro: true, maxActiveClasses: null }).status).toBe("PRO");
  });

  it("keeps every existing field as it was", () => {
    const parsed = parsePlanLimits(OLD_FREE);
    expect(parsed.maxActiveClasses).toBe(1);
    expect(parsed.activeClasses).toBe(1);
    expect(parsed.windowStart).toBe("2026-09-01");
    expect(parsed.windowEnd).toBe("2026-09-29");
  });

  it("treats an unknown status like a missing one", () => {
    const parsed = parsePlanLimits({ ...OLD_FREE, status: "SOMETHING" as never, canStartTrial: true });
    expect(parsed.status).toBe("LEGACY_FREE");
    expect(parsed.canStartTrial).toBe(false);
  });

  it("reads a trial with its dates and days left", () => {
    const parsed = parsePlanLimits({
      ...OLD_FREE,
      isPro: true,
      status: "TRIAL",
      trialStartedAt: "2026-11-04T10:00:00Z",
      trialEndsAt: "2026-12-04T10:00:00Z",
      trialDaysLeft: 30,
      canStartTrial: false,
      lockReason: null,
    });
    expect(parsed.status).toBe("TRIAL");
    expect(parsed.trialEndsAt).toBe("2026-12-04T10:00:00Z");
    expect(parsed.trialDaysLeft).toBe(30);
  });

  it("keeps the lock reason only while LOCKED, and days left only while on the trial", () => {
    const locked = parsePlanLimits({ ...OLD_FREE, status: "LOCKED", lockReason: "trial_expired", trialDaysLeft: 3 });
    expect(locked.lockReason).toBe("trial_expired");
    expect(locked.trialDaysLeft).toBeNull();
    expect(parsePlanLimits({ ...OLD_FREE, status: "LEGACY_FREE", lockReason: "trial_expired" }).lockReason).toBeNull();
    expect(parsePlanLimits({ ...OLD_FREE, status: "LOCKED", lockReason: "bogus" as never }).lockReason).toBeNull();
  });
});

describe("parsePlanLimits trialPromoCode (ENG-360)", () => {
  it("keeps the applied promo code, and reads a missing or empty one as null", () => {
    const trial = { ...OLD_FREE, isPro: true, status: "TRIAL" as const, trialEndsAt: "2027-01-03T10:00:00Z" };
    expect(parsePlanLimits({ ...trial, trialPromoCode: "LIS2026" }).trialPromoCode).toBe("LIS2026");
    expect(parsePlanLimits(trial).trialPromoCode).toBeNull();
    expect(parsePlanLimits({ ...trial, trialPromoCode: "" }).trialPromoCode).toBeNull();
    expect(resolveAccountAccess({ ...trial, trialPromoCode: "LIS2026" }).trialPromoCode).toBe("LIS2026");
  });
});

describe("resolveAccountAccess", () => {
  it("fails open while the limits are unknown", () => {
    expect(resolveAccountAccess(null)).toMatchObject({ status: "LEGACY_FREE", isLocked: false, canStartTrial: false });
  });

  it("is never locked for an old backend's free user", () => {
    expect(resolveAccountAccess(OLD_FREE).isLocked).toBe(false);
  });

  it("reports a locked account that may still start its trial", () => {
    expect(
      resolveAccountAccess({ ...OLD_FREE, status: "LOCKED", lockReason: "trial_not_activated", canStartTrial: true }),
    ).toMatchObject({ isLocked: true, isTrial: false, lockReason: "trial_not_activated", canStartTrial: true });
  });

  it("shows credits only to a known free account, never on the trial, Pro or locked", () => {
    expect(resolveAccountAccess(null).hasCredits).toBe(false);
    expect(resolveAccountAccess(OLD_FREE).hasCredits).toBe(true);
    expect(resolveAccountAccess({ ...OLD_FREE, status: "LEGACY_FREE", canStartTrial: true }).hasCredits).toBe(true);
    expect(resolveAccountAccess({ ...OLD_FREE, isPro: true, status: "TRIAL" }).hasCredits).toBe(false);
    expect(resolveAccountAccess({ ...OLD_FREE, isPro: true, status: "PRO" }).hasCredits).toBe(false);
    expect(resolveAccountAccess({ ...OLD_FREE, status: "LOCKED", lockReason: "trial_expired" }).hasCredits).toBe(false);
  });

  it("reports the trial's end and days left", () => {
    expect(
      resolveAccountAccess({ ...OLD_FREE, isPro: true, status: "TRIAL", trialEndsAt: "2026-12-04T10:00:00Z", trialDaysLeft: 4 }),
    ).toMatchObject({ isTrial: true, isLocked: false, trialEndsAt: "2026-12-04T10:00:00Z", trialDaysLeft: 4 });
  });
});

describe("lock helpers", () => {
  it("picks the paywall copy by lock reason, generic when unknown", () => {
    expect(lockUpgradeReason("trial_expired")).toBe("trial_expired");
    expect(lockUpgradeReason("trial_not_activated")).toBe("trial_not_activated");
    expect(lockUpgradeReason(undefined)).toBe("account_locked");
    expect(lockUpgradeReason("other")).toBe("account_locked");
  });

  it("recognises the account_locked body", () => {
    expect(isAccountLockedPayload({ code: "account_locked", reason: "trial_expired", action: "export" })).toBe(true);
    expect(isAccountLockedPayload({ error: "free_class_limit" })).toBe(false);
    expect(isAccountLockedPayload(null)).toBe(false);
    expect(isAccountLockedPayload("account_locked")).toBe(false);
  });
});
