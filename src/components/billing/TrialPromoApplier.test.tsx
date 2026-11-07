// @vitest-environment jsdom
import { resetTrialPromoApplyGuard } from "@/lib/trialPromo/applyTrialPromo";
import { clearStoredPromo, readStoredPromo, writeStoredPromo } from "@/lib/trialPromo/promoStorage";
import { ApiRequestError } from "@/services/api/client";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({
  limits: null as unknown,
  apply: vi.fn(),
  setPlanLimits: vi.fn(),
  capture: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns}.${key}${values ? ` ${JSON.stringify(values)}` : ""}`,
  useLocale: () => "pt-PT",
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user_1" }) }));
vi.mock("@/hooks/usePlanLimits", () => ({
  usePlanLimits: () => ({ limits: m.limits, loading: false }),
  setPlanLimits: m.setPlanLimits,
}));
vi.mock("@/services/api/me.service", () => ({ meService: { applyTrialPromo: m.apply } }));
vi.mock("posthog-js", () => ({ default: { capture: m.capture } }));
vi.mock("sonner", () => ({ toast: { success: m.toastSuccess, error: m.toastError } }));

import { TrialPromoApplier } from "./TrialPromoApplier";

const BASE: PlanLimits = {
  isPro: true,
  maxActiveClasses: null,
  activeClasses: 0,
  windowStart: null,
  windowEnd: null,
  freeWeekStart: null,
};
const TRIAL: PlanLimits = { ...BASE, status: "TRIAL", trialEndsAt: "2026-12-14T10:00:00Z", trialPromoCode: null };
const EXTENDED: PlanLimits = { ...TRIAL, trialEndsAt: "2027-01-13T10:00:00Z", trialPromoCode: "LIS2026" };

let root: Root | null = null;

async function mount(limits: PlanLimits | null) {
  m.limits = limits;
  const created = createRoot(document.createElement("div"));
  root = created;
  await act(async () => {
    created.render(createElement(StrictMode, null, createElement(TrialPromoApplier)));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  resetTrialPromoApplyGuard();
  clearStoredPromo();
  localStorage.clear();
  [m.apply, m.setPlanLimits, m.capture, m.toastSuccess, m.toastError].forEach((fn) => fn.mockReset());
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe("TrialPromoApplier (ENG-360)", () => {
  it("applies once under strict mode, updates the plan-limits cache and shows the DD/MM toast", async () => {
    writeStoredPromo({ code: "LIS2026", capturedAt: Date.now(), attempts: 0 });
    m.apply.mockResolvedValue(EXTENDED);

    await mount(TRIAL);

    expect(m.apply).toHaveBeenCalledTimes(1);
    expect(m.apply).toHaveBeenCalledWith("LIS2026");
    expect(m.setPlanLimits).toHaveBeenCalledWith("user_1", EXTENDED);
    expect(m.capture).toHaveBeenCalledWith("promo_applied", { code: "LIS2026" });
    expect(m.toastSuccess).toHaveBeenCalledTimes(1);
    expect(m.toastSuccess).toHaveBeenCalledWith('billing.trialPromo.appliedToast {"date":"13/01"}');
    expect(readStoredPromo()).toBeNull();
  });

  it("is silent on a 403 refusal: no toast, only the analytics event", async () => {
    writeStoredPromo({ code: "LIS2026", capturedAt: Date.now(), attempts: 0 });
    m.apply.mockRejectedValue(new ApiRequestError("no", 403, "promo_not_eligible"));

    await mount(TRIAL);

    expect(m.capture).toHaveBeenCalledWith("promo_refused", { code: "LIS2026", reason: "promo_not_eligible" });
    expect(m.toastSuccess).not.toHaveBeenCalled();
    expect(m.toastError).not.toHaveBeenCalled();
    expect(readStoredPromo()).toBeNull();
  });

  it("reports the retry cap as a refusal once the third attempt fails", async () => {
    writeStoredPromo({ code: "LIS2026", capturedAt: Date.now(), attempts: 2 });
    m.apply.mockRejectedValue(new ApiRequestError("not found", 404, null));

    await mount(TRIAL);

    expect(m.capture).toHaveBeenCalledWith("promo_refused", { code: "LIS2026", reason: "max_attempts" });
    expect(m.toastError).not.toHaveBeenCalled();
  });

  it("does not call while the account is not on the trial yet", async () => {
    writeStoredPromo({ code: "LIS2026", capturedAt: Date.now(), attempts: 0 });
    await mount({ ...BASE, isPro: false, status: "LEGACY_FREE" });
    expect(m.apply).not.toHaveBeenCalled();
    expect(readStoredPromo()?.code).toBe("LIS2026");
  });
});
