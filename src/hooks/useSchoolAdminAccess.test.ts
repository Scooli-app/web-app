import { describe, expect, it } from "vitest";
import { canAccessSchoolArea } from "./useSchoolAdminAccess";

const base = {
  hasOrganizationWorkspace: true,
  isOrganizationAdmin: true,
  workspaceClerkOrgId: "org_a",
  sessionOrgId: "org_a",
};

describe("canAccessSchoolArea", () => {
  it("allows an admin whose workspace org is the active Clerk org", () => {
    expect(canAccessSchoolArea(base)).toBe(true);
  });

  it("refuses when the Clerk session has no active org (workspace from a DB fallback)", () => {
    expect(canAccessSchoolArea({ ...base, sessionOrgId: null })).toBe(false);
    expect(canAccessSchoolArea({ ...base, sessionOrgId: undefined })).toBe(false);
  });

  it("refuses when the active Clerk org is a different one", () => {
    expect(canAccessSchoolArea({ ...base, sessionOrgId: "org_b" })).toBe(false);
  });

  it("refuses non-admins and personal workspaces", () => {
    expect(canAccessSchoolArea({ ...base, isOrganizationAdmin: false })).toBe(false);
    expect(canAccessSchoolArea({ ...base, hasOrganizationWorkspace: false })).toBe(false);
  });

  it("accepts any active org when the workspace has no Clerk id", () => {
    expect(canAccessSchoolArea({ ...base, workspaceClerkOrgId: null })).toBe(true);
  });
});
