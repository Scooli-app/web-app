import { describe, expect, it } from "vitest";
import type { RootState } from "@/store/store";
import { selectHasAccessibleOrganization } from "./selectors";

const withContext = (context: unknown) => ({ workspace: { context } }) as unknown as RootState;

describe("selectHasAccessibleOrganization", () => {
  it("is false while the workspace is still loading", () => {
    expect(selectHasAccessibleOrganization(withContext(null))).toBe(false);
  });

  it("is false for a workspace without an organization", () => {
    expect(selectHasAccessibleOrganization(withContext({ organization: null }))).toBe(false);
  });

  it("is true for a workspace with an organization", () => {
    expect(selectHasAccessibleOrganization(withContext({ organization: { id: "org" } }))).toBe(true);
  });
});
