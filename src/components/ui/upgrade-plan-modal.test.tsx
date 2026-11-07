// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({ canStartTrial: false }));
vi.mock("next-intl", () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("@/hooks/useAccountAccess", () => ({ useAccountAccess: () => ({ canStartTrial: state.canStartTrial }) }));
vi.mock("@/components/billing/TrialActivateButton", () => ({
  TrialActivateButton: ({ source }: { source: string }) =>
    createElement("button", { "data-testid": "activate", "data-source": source }, "activate"),
}));

import type { UpgradeReason } from "@/shared/types/plan-limits";
import { UpgradePlanModal } from "./upgrade-plan-modal";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(reason: UpgradeReason | null, canStartTrial: boolean) {
  state.canStartTrial = canStartTrial;
  const el = document.createElement("div");
  document.body.appendChild(el);
  const created = createRoot(el);
  act(() => created.render(createElement(UpgradePlanModal, { open: true, onOpenChange: vi.fn(), reason })));
  root = created;
  host = el;
  // The dialog renders in a portal on <body>.
  return document.body;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const NS = "billing.upgradePlanModal";

describe("UpgradePlanModal trial offer (ENG-320)", () => {
  it("offers the activation inside the paywall when the account can start its trial", () => {
    const body = render("trial_not_activated", true);
    expect(body.querySelector('[data-testid="activate"]')?.getAttribute("data-source")).toBe("paywall");
    expect(body.textContent).toContain(`${NS}.reasons.trial_not_activated.title`);
    expect(body.textContent).toContain(`${NS}.reasons.trial_not_activated.description`);
    expect(body.textContent).toContain(`${NS}.cta`);
  });

  it("shows only the upgrade when the account cannot start a trial", () => {
    const body = render("trial_expired", false);
    expect(body.querySelector('[data-testid="activate"]')).toBeNull();
    expect(body.textContent).toContain(`${NS}.reasons.trial_expired.title`);
    expect(body.textContent).toContain(`${NS}.cta`);
  });

  it("uses the read-only copy without the activation for a never-activated trial that can no longer start", () => {
    const body = render("trial_not_activated", false);
    expect(body.querySelector('[data-testid="activate"]')).toBeNull();
    expect(body.textContent).toContain(`${NS}.reasons.trial_not_activated.descriptionNoTrial`);
  });

  it("offers the activation on a free-plan limit too, when eligible", () => {
    const body = render("free_class_limit", true);
    expect(body.querySelector('[data-testid="activate"]')).not.toBeNull();
    expect(body.textContent).toContain(`${NS}.reasons.free_class_limit.title`);
  });

  it("uses neutral copy, not the limit copy, when the teacher only asked to see the plans", () => {
    const body = render("see_plans", false);
    expect(body.textContent).toContain(`${NS}.reasons.see_plans.title`);
    expect(body.textContent).toContain(`${NS}.reasons.see_plans.description`);
    expect(body.textContent).not.toContain(`${NS}.title`);
  });

  it("keeps the generic copy and no activation for a plain upgrade prompt", () => {
    const body = render(null, false);
    expect(body.textContent).toContain(`${NS}.title`);
    expect(body.querySelector('[data-testid="activate"]')).toBeNull();
  });
});
