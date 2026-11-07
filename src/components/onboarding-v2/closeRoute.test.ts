import { describe, expect, it } from "vitest";
import { routeAfterOnboarding } from "@/components/onboarding-v2/closeRoute";
import { Routes } from "@/shared/types";

describe("routeAfterOnboarding", () => {
  it("keeps the teacher on the document they opened", () => {
    expect(routeAfterOnboarding("/lesson-plan/abc-123")).toBeNull();
    expect(routeAfterOnboarding("/test/abc")).toBeNull();
    expect(routeAfterOnboarding("/quiz/abc")).toBeNull();
    expect(routeAfterOnboarding("/worksheet/abc")).toBeNull();
    expect(routeAfterOnboarding("/presentation/abc/present")).toBeNull();
    expect(routeAfterOnboarding("/curriculum-plan/abc")).toBeNull();
  });
  it("sends every other route to the dashboard", () => {
    expect(routeAfterOnboarding("/dashboard")).toBe(Routes.DASHBOARD);
    expect(routeAfterOnboarding("/lesson-plan")).toBe(Routes.DASHBOARD);
    expect(routeAfterOnboarding("/documents")).toBe(Routes.DASHBOARD);
    expect(routeAfterOnboarding("/lesson-planner/abc")).toBe(Routes.DASHBOARD);
  });
});
