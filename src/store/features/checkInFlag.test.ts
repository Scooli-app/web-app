import { describe, expect, it } from "vitest";
import { FeatureFlag } from "@/shared/types/featureFlags";
import type { RootState } from "../store";
import { selectIsClassStateEnabled } from "./selectors";

const stateWith = (flags: Record<string, boolean>) =>
  ({ features: { flags, loading: false, loaded: true, error: null } }) as unknown as RootState;

describe("selectIsClassStateEnabled", () => {
  it("reads the class_state_enabled key from GET /features", () => {
    expect(FeatureFlag.CLASS_STATE_ENABLED).toBe("class_state_enabled");
    expect(selectIsClassStateEnabled(stateWith({ class_state_enabled: true }))).toBe(true);
  });

  it("is off until the backend enables it", () => {
    expect(selectIsClassStateEnabled(stateWith({}))).toBe(false);
    expect(selectIsClassStateEnabled(stateWith({ class_state_enabled: false }))).toBe(false);
  });
});
