// @vitest-environment jsdom
import { clearStoredPromo, readStoredPromo } from "@/lib/trialPromo/promoStorage";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ check: vi.fn(), capture: vi.fn(), pathname: "/sign-up" }));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns}.${key}${values ? ` ${JSON.stringify(values)}` : ""}`,
}));
vi.mock("next/navigation", () => ({ usePathname: () => api.pathname }));
vi.mock("posthog-js", () => ({ default: { capture: api.capture } }));
vi.mock("@/services/api/trial-promo.service", () => ({ trialPromoService: { check: api.check } }));

import { TRIAL_PROMO_ENTERED_EVENT, TrialPromoCodeField, TrialPromoCodeFieldInClerk } from "./TrialPromoCodeField";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function render(pathname = "/sign-up") {
  api.pathname = pathname;
  host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(createElement(TrialPromoCodeField)));
  return host;
}

async function openAndSubmit(view: HTMLElement, typed: string) {
  await act(async () => (view.querySelector("button") as HTMLButtonElement).click());
  const input = view.querySelector("input") as HTMLInputElement;
  await act(async () => {
    // React tracks the value through the prototype setter; setting input.value directly is ignored.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, typed);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    view.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await act(async () => new Promise((r) => setTimeout(r, 0)));
}

beforeEach(() => {
  api.check.mockReset();
  api.capture.mockReset();
  clearStoredPromo();
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const VALID = { code: "LIS2026", valid: true, name: "Learning Innovation Summit", extraDays: 30, totalTrialDays: 60 };

describe("TrialPromoCodeField (ENG-360)", () => {
  it("starts collapsed behind a link", async () => {
    const view = await render();
    expect(view.textContent).toBe("billing.trialPromo.codeToggle");
    expect(view.querySelector("input")).toBeNull();
  });

  it("stores a valid code like the promo link does and tells the banner", async () => {
    api.check.mockResolvedValue(VALID);
    const heard = vi.fn();
    window.addEventListener(TRIAL_PROMO_ENTERED_EVENT, heard);
    const view = await render();

    await openAndSubmit(view, "  lis2026 ");

    expect(api.check).toHaveBeenCalledWith("LIS2026");
    expect(readStoredPromo()?.code).toBe("LIS2026");
    expect(heard).toHaveBeenCalledTimes(1);
    expect((heard.mock.calls[0][0] as CustomEvent).detail).toEqual(VALID);
    expect(view.querySelector('[data-testid="trial-promo-code-saved"]')?.textContent).toContain('"code":"LIS2026"');
    expect(api.capture).toHaveBeenCalledWith("promo_code_entered", { code: "LIS2026", valid: true });
    window.removeEventListener(TRIAL_PROMO_ENTERED_EVENT, heard);
  });

  it("refuses an invalid or expired code and stores nothing", async () => {
    api.check.mockResolvedValue({ code: "NOPE", valid: false });
    const view = await render();

    await openAndSubmit(view, "nope");

    expect(view.querySelector('[role="alert"]')?.textContent).toBe("billing.trialPromo.codeInvalid");
    expect(view.querySelector("input")?.getAttribute("aria-invalid")).toBe("true");
    expect(readStoredPromo()).toBeNull();
    expect(api.capture).toHaveBeenCalledWith("promo_code_entered", { code: "NOPE", valid: false });
  });

  it("refuses text that can't be a code without calling the backend", async () => {
    const view = await render();

    await openAndSubmit(view, "não é código!");

    expect(api.check).not.toHaveBeenCalled();
    expect(view.querySelector('[role="alert"]')?.textContent).toBe("billing.trialPromo.codeInvalid");
  });

  it("says the check failed when the backend can't be reached, and stores nothing", async () => {
    api.check.mockRejectedValue(new Error("network"));
    const view = await render();

    await openAndSubmit(view, "LIS2026");

    expect(view.querySelector('[role="alert"]')?.textContent).toBe("billing.trialPromo.codeError");
    expect(readStoredPromo()).toBeNull();
  });

  it("renders nothing on the SSO callback", async () => {
    expect((await render("/sign-up/sso-callback")).innerHTML).toBe("");
  });
});

describe("TrialPromoCodeFieldInClerk (ENG-360)", () => {
  function clerkCard(step: string) {
    const card = document.createElement("div");
    card.className = `cl-card ${step}`;
    card.innerHTML = '<div class="cl-main"><form class="cl-form"></form></div>';
    document.body.appendChild(card);
    return card;
  }

  async function mount() {
    api.pathname = "/sign-in";
    host = document.createElement("div");
    document.body.appendChild(host);
    const created = createRoot(host);
    root = created;
    await act(async () => created.render(createElement(TrialPromoCodeFieldInClerk)));
  }

  afterEach(() => {
    document.querySelectorAll(".cl-card").forEach((el) => el.remove());
  });

  it("sits inside Clerk's form area on the first step, after Clerk's own form", async () => {
    const card = clerkCard("cl-signUp-start");
    await mount();

    const slot = card.querySelector(".cl-main > [data-trial-promo-slot]");
    expect(slot?.previousElementSibling?.className).toBe("cl-form");
    expect(slot?.textContent).toBe("billing.trialPromo.codeToggle");
    expect(host?.innerHTML).toBe("");
  });

  it("follows Clerk when it re-renders the card, and shows nothing on later steps", async () => {
    clerkCard("cl-signIn-start");
    await mount();
    expect(document.querySelectorAll("[data-trial-promo-slot]")).toHaveLength(1);

    // Clerk moves on to e.g. email verification: the start card is replaced.
    await act(async () => {
      document.querySelector(".cl-card")?.remove();
      clerkCard("cl-signIn-factorOne");
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.querySelector("[data-trial-promo-slot]")).toBeNull();

    // Back to the first step: the field comes back inside the new card.
    await act(async () => {
      document.querySelector(".cl-card")?.remove();
      clerkCard("cl-signIn-start");
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.querySelector(".cl-card .cl-main [data-trial-promo-slot]")?.textContent).toBe(
      "billing.trialPromo.codeToggle",
    );
  });
});
