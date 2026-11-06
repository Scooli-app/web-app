// @vitest-environment jsdom
import { clearStoredPromo, writeStoredPromo } from "@/lib/trialPromo/promoStorage";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ check: vi.fn(), pathname: "/sign-up" }));
vi.mock("next-intl", () => {
  const t = (ns: string) => {
    const fn = (key: string) => `${ns}.${key}`;
    fn.rich = (key: string, tags: { strong: (chunks: ReactNode) => ReactNode }) => [`${ns}.${key} `, tags.strong("bold")];
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

const VALID = { code: "FEIRA", valid: true, extraDays: 30, validUntil: "2026-12-31T23:59:59Z" };

describe("TrialPromoSignUpBanner (ENG-360)", () => {
  it("shows the offer above the form for a valid code on the URL, checking the normalized code", async () => {
    api.check.mockResolvedValue(VALID);
    const view = await render("/sign-up?promo=feira");
    expect(api.check).toHaveBeenCalledWith("FEIRA");
    const banner = view.querySelector('[data-testid="trial-promo-banner"]');
    expect(banner?.textContent).toContain("billing.trialPromo.signUpBanner");
    expect(banner?.querySelector("strong")?.textContent).toBe("bold");
  });

  it("uses the stored code on /sign-in when the URL no longer has it", async () => {
    writeStoredPromo({ code: "FEIRA", capturedAt: Date.now(), attempts: 0 });
    api.check.mockResolvedValue(VALID);
    const view = await render("/sign-in");
    expect(api.check).toHaveBeenCalledWith("FEIRA");
    expect(view.querySelector('[data-testid="trial-promo-banner"]')).not.toBeNull();
  });

  it("shows nothing for an invalid code", async () => {
    api.check.mockResolvedValue({ code: "NOPE", valid: false });
    const view = await render("/sign-up?promo=nope");
    expect(view.innerHTML).toBe("");
  });

  it("shows nothing when the check fails (backend not deployed yet)", async () => {
    api.check.mockRejectedValue(new Error("404"));
    const view = await render("/sign-up?promo=feira");
    expect(view.innerHTML).toBe("");
  });

  it("shows nothing and checks nothing without a code, or on the SSO callback", async () => {
    expect((await render("/sign-up")).innerHTML).toBe("");
    act(() => root?.unmount());
    writeStoredPromo({ code: "FEIRA", capturedAt: Date.now(), attempts: 0 });
    expect((await render("/sign-up/sso-callback")).innerHTML).toBe("");
    expect(api.check).not.toHaveBeenCalled();
  });
});
