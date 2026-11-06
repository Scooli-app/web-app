// @vitest-environment jsdom
import { clearStoredPromo, readStoredPromo } from "@/lib/trialPromo/promoStorage";
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({ capture: vi.fn(), pathname: "/sign-up" }));
vi.mock("next/navigation", () => ({ usePathname: () => m.pathname }));
vi.mock("posthog-js", () => ({ default: { capture: m.capture } }));

import { TrialPromoCapture } from "./TrialPromoCapture";

let root: Root | null = null;

function mount(url: string) {
  window.history.replaceState(null, "", url);
  m.pathname = new URL(url, "http://localhost").pathname;
  const created = createRoot(document.createElement("div"));
  root = created;
  act(() => created.render(createElement(StrictMode, null, createElement(TrialPromoCapture))));
}

beforeEach(() => {
  m.capture.mockReset();
  clearStoredPromo();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe("TrialPromoCapture (ENG-360)", () => {
  it("stores the upper-cased code from the fair link and reports the open once", () => {
    mount("/sign-up?promo=feira");
    expect(readStoredPromo()?.code).toBe("FEIRA");
    expect(m.capture).toHaveBeenCalledTimes(1);
    expect(m.capture).toHaveBeenCalledWith("promo_link_opened", { code: "FEIRA", path: "/sign-up" });

    // Clerk's next step (or a reload) in the same tab: still stored, not reported again.
    act(() => root?.unmount());
    mount("/sign-up/verify-email-address?promo=FEIRA");
    expect(m.capture).toHaveBeenCalledTimes(1);
  });

  it("captures the code inside redirect_url on the sign-in page", () => {
    mount(`/sign-in?redirect_url=${encodeURIComponent("/checkout?promo=Feira")}`);
    expect(readStoredPromo()?.code).toBe("FEIRA");
  });

  it("stores nothing without a usable code", () => {
    mount("/sign-up?promo=%3Cscript%3E");
    expect(readStoredPromo()).toBeNull();
    expect(m.capture).not.toHaveBeenCalled();
  });
});
