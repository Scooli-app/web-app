import { describe, expect, it } from "vitest";
import { FeatureFlag } from "@/shared/types/featureFlags";
import type { RootState } from "../store";
import en from "../../../messages/en.json";
import pt from "../../../messages/pt-PT.json";
import { selectIsSourcesPageEnabled } from "./selectors";

const stateWith = (flags: Record<string, boolean>) =>
  ({ features: { flags, loading: false, loaded: true, error: null } }) as unknown as RootState;

describe("selectIsSourcesPageEnabled (Fontes page and sidebar item)", () => {
  it.each([
    [{ [FeatureFlag.USER_SOURCES]: true }, true],
    [{ [FeatureFlag.ORGANIZATION_SOURCES]: true }, true],
    [{ [FeatureFlag.USER_SOURCES]: true, [FeatureFlag.ORGANIZATION_SOURCES]: true }, true],
    [{}, false],
  ])("%j -> %s", (flags, expected) => {
    expect(selectIsSourcesPageEnabled(stateWith(flags))).toBe(expected);
  });
});

describe("Fontes sidebar label", () => {
  it("is the page's own neutral title, since the page may hold only school and curriculum sources", () => {
    expect(pt.nav.items.sources.title).toBe(pt.sources.page.title);
    expect(en.nav.items.sources.title).toBe(en.sources.page.title);
    expect(pt.nav.items.sources.title).not.toMatch(/minhas/i);
    expect(en.nav.items.sources.title).not.toMatch(/\bmy\b/i);
  });
});
