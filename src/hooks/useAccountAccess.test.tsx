// @vitest-environment jsdom
import type { PlanLimits } from "@/shared/types/plan-limits";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({ limits: null as PlanLimits | null, dispatch: vi.fn() }));
vi.mock("@/hooks/usePlanLimits", () => ({ usePlanLimits: () => ({ limits: state.limits, loading: false }) }));
vi.mock("@/store/hooks", () => ({ useAppDispatch: () => state.dispatch }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import { useAccountAccess, type AccountAccessState } from "./useAccountAccess";

const BASE: PlanLimits = {
  isPro: false,
  maxActiveClasses: 1,
  activeClasses: 0,
  windowStart: null,
  windowEnd: null,
  freeWeekStart: null,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function readAccess(limits: PlanLimits | null): AccountAccessState {
  state.limits = limits;
  const captured: { access?: AccountAccessState } = {};
  function Probe() {
    captured.access = useAccountAccess();
    return null;
  }
  container = document.createElement("div");
  const created = createRoot(container);
  root = created;
  act(() => created.render(createElement(Probe)));
  if (!captured.access) throw new Error("the hook did not render");
  return captured.access;
}

beforeEach(() => {
  state.dispatch.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container = null;
});

describe("useAccountAccess guard (ENG-321)", () => {
  it("lets every action run for an account that is not locked", () => {
    const access = readAccess({ ...BASE, status: "LEGACY_FREE" });
    expect(access.isLocked).toBe(false);
    expect(access.guard("generate")).toBe(true);
    expect(access.guard("export")).toBe(true);
    expect(state.dispatch).not.toHaveBeenCalled();
  });

  it("lets actions run while the limits are unknown (the server still refuses)", () => {
    expect(readAccess(null).guard("share")).toBe(true);
  });

  it("lets actions run for an old backend's free user (no status)", () => {
    expect(readAccess(BASE).guard("duplicate")).toBe(true);
  });

  it("blocks a locked action and opens the paywall with the lock reason", () => {
    const access = readAccess({ ...BASE, status: "LOCKED", lockReason: "trial_expired" });
    expect(access.isLocked).toBe(true);
    expect(access.guard("export")).toBe(false);
    expect(access.guard("create")).toBe(false);
    expect(state.dispatch).toHaveBeenCalledWith({ type: "ui/openUpgradeModalForReason", payload: "trial_expired" });
  });

  it("opens the generic read-only paywall when the lock reason is unknown", () => {
    const access = readAccess({ ...BASE, status: "LOCKED" });
    expect(access.guard("print")).toBe(false);
    expect(state.dispatch).toHaveBeenCalledWith({ type: "ui/openUpgradeModalForReason", payload: "account_locked" });
  });

  it("exposes the trial eligibility for the activation buttons", () => {
    const access = readAccess({ ...BASE, status: "LOCKED", lockReason: "trial_not_activated", canStartTrial: true });
    expect(access.canStartTrial).toBe(true);
    expect(access.lockReason).toBe("trial_not_activated");
  });
});
