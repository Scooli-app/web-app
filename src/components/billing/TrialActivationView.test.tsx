// @vitest-environment jsdom
import { ApiRequestError } from "@/services/api/client";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ getPlanLimits: vi.fn(), activate: vi.fn() }));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns}.${key}${values ? ` ${JSON.stringify(values)}` : ""}`,
  useLocale: () => "pt-PT",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => createElement("a", { href }, children as never),
}));
vi.mock("@/services/api/me.service", () => ({ meService: { getPlanLimits: api.getPlanLimits } }));
vi.mock("@/hooks/useTrialActivation", () => ({
  useTrialActivation: () => ({ activate: api.activate, activating: false }),
}));
vi.mock("@/components/billing/TrialActivateButton", () => ({
  TrialActivateButton: () => createElement("button", { "data-testid": "in-app-activate" }, "activate"),
}));

import { TrialActivationView } from "./TrialActivationView";

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

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderView(token: string | null) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  container = host;
  root = created;
  await act(async () => {
    created.render(createElement(TrialActivationView, { token }));
  });
  // Let the read + POST settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return host;
}

beforeEach(() => {
  api.getPlanLimits.mockReset();
  api.activate.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const NS = "billing.trialActivation";

describe("TrialActivationView (ENG-320)", () => {
  it("activates the token once and shows the end date as DD/MM with a link to the dashboard", async () => {
    api.getPlanLimits.mockResolvedValue(LEGACY);
    api.activate.mockResolvedValue(TRIAL);

    const html = (await renderView("tok")).innerHTML;

    expect(api.activate).toHaveBeenCalledTimes(1);
    expect(api.activate).toHaveBeenCalledWith("tok");
    expect(html).toContain(`${NS}.successTitle {"date":"04/12"}`);
    expect(html).toContain('href="/dashboard"');
  });

  it("shows the current trial, once, when it is already active", async () => {
    api.getPlanLimits.mockResolvedValue(TRIAL);

    const html = (await renderView("tok")).innerHTML;

    expect(api.activate).not.toHaveBeenCalled();
    expect(html).toContain(`${NS}.alreadyActiveTitle {"date":"04/12"}`);
    expect(html).not.toContain(`${NS}.successTitle`);
  });

  it("offers the in-app activation after an expired link when still eligible", async () => {
    api.getPlanLimits.mockResolvedValue(LEGACY);
    api.activate.mockRejectedValue(new ApiRequestError("x", 403, "trial_link_expired"));

    const view = await renderView("tok");

    expect(view.innerHTML).toContain("billing.trial.errors.trial_link_expired");
    expect(view.innerHTML).toContain(`${NS}.expiredCanStart`);
    expect(view.querySelector('[data-testid="in-app-activate"]')).not.toBeNull();
  });

  it("sends an ineligible teacher with an expired link to the upgrade", async () => {
    api.getPlanLimits.mockResolvedValue({ ...LEGACY, status: "LOCKED", canStartTrial: false });
    api.activate.mockRejectedValue(new ApiRequestError("x", 403, "trial_link_expired"));

    const view = await renderView("tok");

    expect(view.querySelector('[data-testid="in-app-activate"]')).toBeNull();
    expect(view.innerHTML).toContain('href="/checkout"');
    expect(view.innerHTML).toContain(`${NS}.expiredUpgrade`);
  });

  it("explains a not-eligible account and offers the upgrade", async () => {
    api.getPlanLimits.mockResolvedValue({ ...LEGACY, canStartTrial: false });
    api.activate.mockRejectedValue(new ApiRequestError("x", 403, "trial_not_eligible"));

    const html = (await renderView("tok")).innerHTML;

    expect(html).toContain("billing.trial.errors.trial_not_eligible");
    expect(html).toContain(`${NS}.notEligibleDescription`);
    expect(html).toContain('href="/checkout"');
  });

  it("shows the invalid-link error with the in-app activation when eligible", async () => {
    api.getPlanLimits.mockResolvedValue(LEGACY);
    api.activate.mockRejectedValue(new ApiRequestError("x", 403, "trial_token_invalid"));

    const view = await renderView("tok");

    expect(view.innerHTML).toContain("billing.trial.errors.trial_token_invalid");
    expect(view.querySelector('[data-testid="in-app-activate"]')).not.toBeNull();
  });

  it("shows a generic message when the trial is not available", async () => {
    api.getPlanLimits.mockResolvedValue({ ...BASE, status: "LEGACY_FREE" });
    api.activate.mockRejectedValue(new ApiRequestError("x", 403, "trial_not_available"));

    const html = (await renderView("tok")).innerHTML;

    expect(html).toContain("billing.trial.errors.trial_not_available");
    expect(html).toContain('href="/dashboard"');
  });

  it("offers a retry after a network failure", async () => {
    api.getPlanLimits.mockResolvedValue(LEGACY);
    api.activate.mockRejectedValueOnce(new ApiRequestError("offline", 0, null)).mockResolvedValueOnce(TRIAL);

    const view = await renderView("tok");
    expect(view.innerHTML).toContain(`${NS}.genericErrorTitle`);

    const retry = [...view.querySelectorAll("button")].find((b) => b.textContent === `${NS}.retry`);
    expect(retry).toBeDefined();
    await act(async () => {
      retry?.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(api.activate).toHaveBeenCalledTimes(2);
    expect(view.innerHTML).toContain(`${NS}.successTitle`);
  });
});
