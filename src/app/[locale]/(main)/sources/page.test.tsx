// @vitest-environment jsdom
import { configureStore } from "@reduxjs/toolkit";
import { NextIntlClientProvider } from "next-intl";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import pt from "../../../../../messages/pt-PT.json";
import { FeatureFlag } from "@/shared/types/featureFlags";
import { LONG_NAME } from "@/shared/test/longContent";
import type { UserSource } from "@/shared/types/sources";
import rootReducer from "@/store/rootReducer";
import SourcesPage from "./page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ isPro: true, listSources: vi.fn() }));
vi.mock("@/hooks/usePlanLimits", () => ({
  usePlanLimits: () => ({ limits: { isPro: mocks.isPro }, loading: false }),
}));
vi.mock("@/services/api/sources.service", () => ({
  listSources: mocks.listSources,
  listSourceDefaults: vi.fn().mockResolvedValue([]),
  setSourceDefault: vi.fn(),
}));

const personal = (i: number, name = `Manual ${i}`): UserSource =>
  ({
    id: `p${i}`, name, scope: "personal", status: "indexed", fileKind: "pdf", fileSizeBytes: 140 * 1024, chunkCount: 4,
    retryCount: 0, createdAt: "2026-11-22T10:00:00Z", updatedAt: "2026-11-22T10:00:00Z",
  }) as UserSource;

async function mount({ isPro = true, userSources = true, mine = [] as UserSource[] } = {}) {
  mocks.isPro = isPro;
  mocks.listSources.mockReset().mockResolvedValue(mine);
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      features: {
        flags: { [FeatureFlag.USER_SOURCES]: userSources, [FeatureFlag.ORGANIZATION_SOURCES]: true },
        loading: false, loaded: true, error: null,
      },
    } as never,
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <Provider store={store}>
        <NextIntlClientProvider locale="pt-PT" messages={pt}>
          <SourcesPage />
        </NextIntlClientProvider>
      </Provider>,
    );
  });
  return container;
}

const p = pt.sources.page;
const headings = (c: HTMLElement) => [...c.querySelectorAll("h2")].map((h) => h.textContent?.replace(/\s*\(\d+\)$/, ""));
const dropzone = (c: HTMLElement) => [...c.querySelectorAll('[role="button"]')].find((el) => el.textContent?.includes(p.dropzoneEmpty));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Fontes page, As tuas fontes", () => {
  it("puts the one upload entry inside As tuas fontes, keyboard reachable, with no second Carregar button", async () => {
    const c = await mount({ mine: [personal(1)] });
    expect(headings(c)).toContain(p.yours);
    const zone = dropzone(c);
    expect(zone?.getAttribute("tabindex")).toBe("0");
    expect(zone?.closest("section")?.querySelector("h2")?.textContent).toContain(p.yours);
    expect([...c.querySelectorAll("button")].filter((b) => b.textContent?.trim() === p.upload)).toHaveLength(0);
  });

  it("shows a free teacher what Pro unlocks instead of the dropzone", async () => {
    const c = await mount({ isPro: false });
    expect(c.textContent).toContain(p.proTitle);
    expect(dropzone(c)).toBeUndefined();
  });

  it("has no personal block for a school member without user_sources", async () => {
    const c = await mount({ userSources: false, mine: [personal(1)] });
    expect(headings(c)).not.toContain(p.yours);
    expect(mocks.listSources).not.toHaveBeenCalled();
  });

  it("lists 20 sources, clamping a very long name with the full name in the title", async () => {
    const mine = [personal(0, LONG_NAME), ...Array.from({ length: 19 }, (_, i) => personal(i + 1))];
    const c = await mount({ mine });
    expect(c.textContent).toContain(`${p.yours}(20)`);
    const name = c.querySelector<HTMLElement>(`p[title="${LONG_NAME}"]`);
    expect(name?.className).toContain("line-clamp-2");
    expect(c.querySelectorAll(`button[aria-label="${p.deleteAriaLabel}"]`)).toHaveLength(20);
  });

  it("shows the empty state with its upload action when there are no sources", async () => {
    const c = await mount({ mine: [] });
    expect(c.textContent).toContain(p.emptyState);
    expect(c.textContent).toContain(p.emptyAction);
  });
});
