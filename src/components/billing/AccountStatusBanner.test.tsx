// @vitest-environment jsdom
import type { AccountAccessState } from "@/hooks/useAccountAccess";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({ access: null as unknown, hasPro: false }));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns}.${key}${values ? ` ${JSON.stringify(values)}` : ""}`,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, onClick: _onClick, ...rest }: { href: string; children: unknown; onClick?: unknown }) =>
    createElement("a", { href, ...rest }, children as never),
}));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/hooks/useAccountAccess", () => ({ useAccountAccess: () => state.access }));
vi.mock("@/hooks/usePlanLimits", () => ({ invalidatePlanLimits: vi.fn() }));
vi.mock("@/store/hooks", () => ({ useAppSelector: () => state.hasPro }));
vi.mock("@/components/billing/TrialActivateButton", () => ({
  TrialActivateButton: ({ source }: { source: string }) => createElement("button", { "data-testid": "activate", "data-source": source }),
}));

import { AccountStatusBanner, TrialDaysChip } from "./AccountStatusBanner";

function access(over: Partial<AccountAccessState>): AccountAccessState {
  return {
    status: "LEGACY_FREE",
    isLocked: false,
    isTrial: false,
    lockReason: null,
    canStartTrial: false,
    trialEndsAt: null,
    trialDaysLeft: null,
    trialPromoCode: null,
    hasCredits: false,
    loading: false,
    guard: () => true,
    ...over,
  };
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(component: typeof AccountStatusBanner | typeof TrialDaysChip, value: AccountAccessState): HTMLDivElement {
  state.access = value;
  const el = document.createElement("div");
  document.body.appendChild(el);
  const created = createRoot(el);
  act(() => created.render(createElement(component)));
  root = created;
  host = el;
  return el;
}

const render = (value: AccountAccessState) => mount(AccountStatusBanner, value);
const renderChip = (value: AccountAccessState) => mount(TrialDaysChip, value);

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const NS = "billing.banner";

describe("AccountStatusBanner (ENG-320/321)", () => {
  it("shows no banner while more than 5 days of the trial are left (the header chip has it)", () => {
    const view = render(access({ status: "TRIAL", isTrial: true, trialDaysLeft: 12 }));
    expect(view.querySelector("section")).toBeNull();
    expect(view.querySelector('[data-testid="activate"]')).toBeNull();
  });

  it("the header chip says the days left, links to the plans and has the full sentence as its name", () => {
    const view = renderChip(access({ status: "TRIAL", isTrial: true, trialDaysLeft: 60 }));
    const link = view.querySelector('a[href="/checkout"]');
    expect(link?.textContent).toBe(`${NS}.trialChip {"days":60}`);
    expect(link?.getAttribute("title")).toBe(`${NS}.trialDiscreet {"days":60}`);
    expect(link?.getAttribute("aria-label")).toBe(`${NS}.trialDiscreet {"days":60}. ${NS}.seePlans`);
  });

  it("the header chip steps aside in the last 5 days, and outside the trial", () => {
    expect(renderChip(access({ status: "TRIAL", isTrial: true, trialDaysLeft: 5 })).innerHTML).toBe("");
    act(() => root?.unmount());
    expect(renderChip(access({ status: "PRO" })).innerHTML).toBe("");
    act(() => root?.unmount());
    expect(renderChip(access({ status: "LOCKED", isLocked: true })).innerHTML).toBe("");
  });

  it("becomes prominent, with the upgrade button, in the last 5 days", () => {
    const view = render(access({ status: "TRIAL", isTrial: true, trialDaysLeft: 5 }));
    expect(view.textContent).toContain(`${NS}.trialEndingTitle {"days":5}`);
    expect(view.textContent).toContain(`${NS}.trialEndingDescription`);
    expect(view.querySelector('a[href="/checkout"]')?.textContent).toBe(`${NS}.upgradeCta`);
    expect(view.textContent).not.toContain(`${NS}.trialDiscreet`);
  });

  it("shows the read-only notice for an expired trial, with the upgrade and no activation", () => {
    const view = render(access({ status: "LOCKED", isLocked: true, lockReason: "trial_expired" }));
    expect(view.textContent).toContain(`${NS}.lockedTitle`);
    expect(view.textContent).toContain(`${NS}.lockedReason.trial_expired`);
    expect(view.querySelector('a[href="/checkout"]')).not.toBeNull();
    expect(view.querySelector('[data-testid="activate"]')).toBeNull();
    // Printing shows only the upgrade message while locked.
    expect(document.body.dataset.printLocked).toBe("billing.lock.printMessage");
  });

  it("offers the activation next to the upgrade when the trial was never activated", () => {
    const view = render(
      access({ status: "LOCKED", isLocked: true, lockReason: "trial_not_activated", canStartTrial: true }),
    );
    expect(view.textContent).toContain(`${NS}.lockedReason.trial_not_activated`);
    expect(view.querySelector('[data-testid="activate"]')?.getAttribute("data-source")).toBe("locked_banner");
    expect(view.querySelector('a[href="/checkout"]')).not.toBeNull();
  });

  it("offers the free Pro month to an eligible legacy free account", () => {
    const view = render(access({ status: "LEGACY_FREE", canStartTrial: true }));
    expect(view.textContent).toContain(`${NS}.offerTitle`);
    expect(view.querySelector('[data-testid="activate"]')?.getAttribute("data-source")).toBe("offer_banner");
    expect(document.body.dataset.printLocked).toBeUndefined();
  });

  it("renders nothing for a Pro account", () => {
    const view = render(access({ status: "PRO" }));
    expect(view.innerHTML).toBe("");
  });

  it("renders nothing for a plain free account (old backend)", () => {
    const view = render(access({ status: "LEGACY_FREE" }));
    expect(view.innerHTML).toBe("");
  });
});
