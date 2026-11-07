// @vitest-environment jsdom
import { clearStoredPromo, writeStoredPromo } from "@/lib/trialPromo/promoStorage";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ check: vi.fn(), pathname: "/sign-up" }));
vi.mock("next-intl", () => {
  const t = (ns: string) => {
    const fn = (key: string, values?: Record<string, unknown>) => `${ns}.${key}${values ? ` ${JSON.stringify(values)}` : ""}`;
    fn.rich = (key: string, values: { strong: (chunks: ReactNode) => ReactNode } & Record<string, unknown>) => {
      const { strong, ...plain } = values;
      return [`${ns}.${key} ${JSON.stringify(plain)} `, strong("bold")];
    };
    return fn;
  };
  return { useTranslations: t };
});
vi.mock("next/navigation", () => ({ usePathname: () => api.pathname }));
vi.mock("@/services/api/trial-promo.service", () => ({ trialPromoService: { check: api.check } }));

import { resetTrialPromoChecks, TrialPromoSignUpBanner } from "./TrialPromoSignUpBanner";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function render(url: string) {
  window.history.replaceState(null, "", url);
  api.pathname = new URL(url, "http://localhost").pathname;
  const el = document.createElement("div");
  document.body.appendChild(el);
  const created = createRoot(el);
  root = created;
  host = el;
  await act(async () => {
    created.render(createElement(TrialPromoSignUpBanner));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return el;
}

beforeEach(() => {
  api.check.mockReset();
  resetTrialPromoChecks();
  clearStoredPromo();
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const VALID = { code: "LIS2026", valid: true, name: "Learning Innovation Summit", extraDays: 30, totalTrialDays: 60, validUntil: "2026-12-31T23:59:59Z" };

describe("TrialPromoSignUpBanner (ENG-360)", () => {
  it("shows the offer above the form for a valid code on the URL, checking the normalized code", async () => {
    api.check.mockResolvedValue(VALID);
    const view = await render("/sign-up?promo=lis2026");
    expect(api.check).toHaveBeenCalledWith("LIS2026");
    const banner = view.querySelector('[data-testid="trial-promo-banner"]');
    expect(banner?.textContent).toContain("billing.trialPromo.signUpBanner");
    expect(banner?.textContent).toContain('"name":"Learning Innovation Summit"');
    expect(banner?.textContent).toContain('"duration":"billing.trialPromo.durationMonths {\\"count\\":2}"');
    expect(banner?.querySelector("strong")?.textContent).toBe("bold");
  });

  it("says months for multiples of 30 days and days otherwise, from the promo's own name and length", async () => {
    api.check.mockResolvedValue({ ...VALID, name: "Escola Aberta", totalTrialDays: 45 });
    const view = await render("/sign-up?promo=lis2026");
    const text = view.querySelector('[data-testid="trial-promo-banner"]')?.textContent ?? "";
    expect(text).toContain('"name":"Escola Aberta"');
    expect(text).toContain("durationDays");
    expect(text).toContain('\\"count\\":45');
    expect(text).not.toContain("Learning Innovation Summit");
  });

  it("shows nothing for a valid code without a usable name or trial length", async () => {
    api.check.mockResolvedValue({ ...VALID, totalTrialDays: undefined });
    expect((await render("/sign-up?promo=lis2026")).innerHTML).toBe("");
  });

  it("uses the stored code on /sign-in when the URL no longer has it", async () => {
    writeStoredPromo({ code: "LIS2026", capturedAt: Date.now(), attempts: 0 });
    api.check.mockResolvedValue(VALID);
    const view = await render("/sign-in");
    expect(api.check).toHaveBeenCalledWith("LIS2026");
    expect(view.querySelector('[data-testid="trial-promo-banner"]')).not.toBeNull();
  });

  it("shows nothing for an invalid code", async () => {
    api.check.mockResolvedValue({ code: "NOPE", valid: false });
    const view = await render("/sign-up?promo=nope");
    expect(view.innerHTML).toBe("");
  });

  it("shows nothing when the check fails (backend not deployed yet)", async () => {
    api.check.mockRejectedValue(new Error("404"));
    const view = await render("/sign-up?promo=lis2026");
    expect(view.innerHTML).toBe("");
  });

  it("shows nothing and checks nothing without a code, or on the SSO callback", async () => {
    expect((await render("/sign-up")).innerHTML).toBe("");
    act(() => root?.unmount());
    writeStoredPromo({ code: "LIS2026", capturedAt: Date.now(), attempts: 0 });
    expect((await render("/sign-up/sso-callback")).innerHTML).toBe("");
    expect(api.check).not.toHaveBeenCalled();
  });
});
