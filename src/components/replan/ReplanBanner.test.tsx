// @vitest-environment jsdom
import type { ReplanProposal } from "@/shared/types/replan";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReplanBanner, ReplanBannerView } from "./ReplanBanner";
import { REPLAN_POLL_MS } from "./replanLogic";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/store/hooks", () => ({ useAppSelector: (selector: () => unknown) => selector() }));
vi.mock("@/store/entitlements/selectors", () => ({ selectHasEffectivePro: () => true }));
vi.mock("@/services/api/replan.service", () => ({
  replanService: { current: vi.fn(), accept: vi.fn(), reject: vi.fn() },
}));

import { replanService } from "@/services/api/replan.service";

const generating: ReplanProposal = {
  id: "p1",
  status: "generating",
  trigger: "NOT_HELD",
  triggerSlotId: "s0",
  summary: null,
  createdAt: null,
  items: [],
};

describe("ReplanBannerView", () => {
  it("says a proposal is being prepared, with no action", () => {
    const html = renderToStaticMarkup(
      createElement(ReplanBannerView, { state: { kind: "generating" }, onReview: vi.fn(), onShiftFallback: vi.fn() }),
    );
    expect(html).toContain("bannerGenerating");
    expect(html).not.toContain(">review<");
    expect(html).not.toContain("shiftFallback");
  });

  it("offers to review a pending proposal, with its change count", () => {
    const html = renderToStaticMarkup(
      createElement(ReplanBannerView, {
        state: { kind: "pending", count: 3 },
        onReview: vi.fn(),
        onShiftFallback: vi.fn(),
      }),
    );
    expect(html).toContain("bannerPending:");
    expect(html).toContain(">review</button>");
    expect(html).not.toContain("shiftFallback");
  });

  it("offers the old shift when the proposal failed", () => {
    const html = renderToStaticMarkup(
      createElement(ReplanBannerView, {
        state: { kind: "failed", triggerSlotId: "s0" },
        onReview: vi.fn(),
        onShiftFallback: vi.fn(),
      }),
    );
    expect(html).toContain("bannerFailed");
    expect(html).toContain("shiftFallback");
    expect(html).not.toContain(">review<");
  });

  it("offers no shift when a failed proposal has no trigger lesson", () => {
    const html = renderToStaticMarkup(
      createElement(ReplanBannerView, {
        state: { kind: "failed", triggerSlotId: null },
        onReview: vi.fn(),
        onShiftFallback: vi.fn(),
      }),
    );
    expect(html).toContain("bannerFailed");
    expect(html).not.toContain("shiftFallback");
  });
});

describe("ReplanBanner polling", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(replanService.current).mockReset();
    vi.mocked(replanService.current).mockResolvedValue(generating);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it("polls while generating and stops when the screen unmounts", async () => {
    await act(async () => {
      root.render(createElement(ReplanBanner, { timetableId: "tt1", onChanged: vi.fn() }));
    });
    expect(replanService.current).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPLAN_POLL_MS);
    });
    expect(replanService.current).toHaveBeenCalledTimes(2);

    act(() => root.unmount());
    const callsAtUnmount = vi.mocked(replanService.current).mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPLAN_POLL_MS * 20);
    });
    expect(replanService.current).toHaveBeenCalledTimes(callsAtUnmount);
  });
});
