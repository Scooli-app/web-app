import { describe, expect, it } from "vitest";
import { FeatureFlag } from "@/shared/types/featureFlags";
import type { RootState } from "../store";
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
