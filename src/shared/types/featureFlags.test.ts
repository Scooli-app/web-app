import { describe, expect, it } from "vitest";
import {
  FeatureFlag,
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