// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({ access: null as unknown }));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, values?: Record<string, unknown>) =>
    `${ns}.${key}${values ? ` ${JSON.stringify(values)}` : ""}`,
  useLocale: () => "pt-PT",
}));
vi.mock("@/hooks/useAccountAccess", () => ({ useAccountAccess: () => state.access }));
vi.mock("@/components/billing/TrialActivateButton", () => ({ TrialActivateButton: () => null }));

import { TrialStatusCard } from "./TrialStatusCard";

let root: Root | null = null;

function render(trialPromoCode: string | null) {
  state.access = {
    status: "TRIAL",
    isLocked: false,
    lockReason: null,
    canStartTrial: false,
    trialEndsAt: "2027-01-13T10:00:00Z",
    trialDaysLeft: 60,
    trialPromoCode,
  };
  const el = document.createElement("div");
  const created = createRoot(el);
  root = created;
  act(() => created.render(createElement(TrialStatusCard)));
  return el;
}

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe("TrialStatusCard promo line (ENG-360)", () => {
  it("says the trial includes the promo offer", () => {
    expect(render("LIS2026").textContent).toContain('billing.trialStatusCard.promoIncluded {"code":"LIS2026"}');
  });

  it("has no promo line without a promo", () => {
    expect(render(null).textContent).not.toContain("promoIncluded");
  });
});
