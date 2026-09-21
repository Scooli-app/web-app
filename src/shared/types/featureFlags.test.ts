import { describe, expect, it } from "vitest";
import {
  FeatureFlag,
  isClassStateFeatureEnabled,
  isTeacherProfileFeatureEnabled,
} from "./featureFlags";

describe("isTeacherProfileFeatureEnabled", () => {
  it("fails closed until the backend explicitly enables the feature", () => {
    expect(isTeacherProfileFeatureEnabled({})).toBe(false);
    expect(
      isTeacherProfileFeatureEnabled({
        [FeatureFlag.TEACHER_PROFILE]: false,
      }),
    ).toBe(false);
  });

  it("enables the profile only for an evaluated true flag", () => {
    expect(
      isTeacherProfileFeatureEnabled({
        [FeatureFlag.TEACHER_PROFILE]: true,
      }),
    ).toBe(true);
  });
});

describe("isClassStateFeatureEnabled", () => {
  it("fails closed until the backend explicitly enables the feature", () => {
    expect(isClassStateFeatureEnabled({})).toBe(false);
    expect(
      isClassStateFeatureEnabled({
        [FeatureFlag.CLASS_STATE]: false,
      }),
    ).toBe(false);
  });

  it("enables Class State only for an evaluated true flag", () => {
    expect(
      isClassStateFeatureEnabled({
        [FeatureFlag.CLASS_STATE]: true,
      }),
    ).toBe(true);
  });
});