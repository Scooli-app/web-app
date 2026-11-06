import { ApiRequestError } from "@/services/api/client";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { describe, expect, it, vi } from "vitest";
import { resolveTrialActivation } from "./trialActivationFlow";

const BASE: PlanLimits = {
  isPro: false,
  maxActiveClasses: 1,
  activeClasses: 0,
  windowStart: null,
  windowEnd: null,
  freeWeekStart: null,
};
const LEGACY = { ...BASE, status: "LEGACY_FREE" as const, canStartTrial: true };
const TRIAL = { ...BASE, isPro: true, status: "TRIAL" as const, trialEndsAt: "2026-12-04T10:00:00Z", trialDaysLeft: 30 };

const refused = (code: string) => new ApiRequestError("msg", 403, code);

describe("resolveTrialActivation (ENG-320)", () => {
  it("activates with the token and reports the new trial", async () => {
    const activate = vi.fn().mockResolvedValue(TRIAL);
    const outcome = await resolveTrialActivation("tok", { getLimits: async () => LEGACY, activate });
    expect(activate).toHaveBeenCalledWith("tok");
    expect(outcome).toEqual({ kind: "started", limits: TRIAL });
  });

  it("shows the running trial without posting again when it is already active", async () => {
    const activate = vi.fn();
    const outcome = await resolveTrialActivation("tok", { getLimits: async () => TRIAL, activate });
    expect(activate).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "alreadyActive", limits: TRIAL });
  });

  it("tells a Pro teacher they already have Pro", async () => {
    const activate = vi.fn();
    const outcome = await resolveTrialActivation("tok", { getLimits: async () => ({ ...BASE, isPro: true, status: "PRO" }), activate });
    expect(activate).not.toHaveBeenCalled();
    expect(outcome).toEqual({ kind: "alreadyPro" });
  });

  it("still posts when the account could not be read first", async () => {
    const activate = vi.fn().mockResolvedValue(TRIAL);
    const outcome = await resolveTrialActivation("tok", { getLimits: async () => Promise.reject(new Error("down")), activate });
    expect(outcome.kind).toBe("started");
  });

  it("offers the in-app activation after an expired link when the teacher is still eligible", async () => {
    const outcome = await resolveTrialActivation("tok", {
      getLimits: async () => LEGACY,
      activate: vi.fn().mockRejectedValue(refused("trial_link_expired")),
    });
    expect(outcome).toEqual({ kind: "error", code: "trial_link_expired", canStartTrial: true });
  });

  it("sends an ineligible teacher with an expired link to the upgrade", async () => {
    const outcome = await resolveTrialActivation("tok", {
      getLimits: async () => ({ ...LEGACY, status: "LOCKED", canStartTrial: false }),
      activate: vi.fn().mockRejectedValue(refused("trial_link_expired")),
    });
    expect(outcome).toEqual({ kind: "error", code: "trial_link_expired", canStartTrial: false });
  });

  it.each(["trial_not_eligible", "trial_token_invalid", "trial_not_available"])("reports %s", async (code) => {
    const outcome = await resolveTrialActivation("tok", {
      getLimits: async () => LEGACY,
      activate: vi.fn().mockRejectedValue(refused(code)),
    });
    expect(outcome).toEqual({ kind: "error", code, canStartTrial: true });
  });

  it("reports any other failure without a code, so the page offers a retry", async () => {
    const outcome = await resolveTrialActivation("tok", {
      getLimits: async () => LEGACY,
      activate: vi.fn().mockRejectedValue(new ApiRequestError("offline", 0, null)),
    });
    expect(outcome).toEqual({ kind: "error", code: null, canStartTrial: true });
  });

  it("does not post without a token, and says whether the in-app activation is possible", async () => {
    const activate = vi.fn();
    expect(await resolveTrialActivation(null, { getLimits: async () => LEGACY, activate })).toEqual({ kind: "noToken", canStartTrial: true });
    expect(activate).not.toHaveBeenCalled();
  });
});
