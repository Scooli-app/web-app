"use client";

import { useAppSelector } from "@/store/hooks";
import {
  selectHasOrganizationWorkspace,
  selectIsOrganizationAdmin,
  selectWorkspaceContext,
  selectWorkspaceReady,
} from "@/store/workspace/selectors";
import { useAuth } from "@clerk/nextjs";

/**
 * Pure rule behind {@link useSchoolAdminAccess}: the school area needs an admin workspace AND that
 * same organization active in the Clerk session. The backend's `/organizations/current/*` endpoints
 * read the organization from the token's `org_id` only, while `/workspace` can fall back to a
 * database membership; without this check the school view rendered and every call answered 404.
 */
export function canAccessSchoolArea(input: {
  hasOrganizationWorkspace: boolean;
  isOrganizationAdmin: boolean;
  workspaceClerkOrgId: string | null | undefined;
  sessionOrgId: string | null | undefined;
}): boolean {
  const { hasOrganizationWorkspace, isOrganizationAdmin, workspaceClerkOrgId, sessionOrgId } = input;
  if (!hasOrganizationWorkspace || !isOrganizationAdmin || !sessionOrgId) return false;
  // An older backend may not send the Clerk id: then the active session org is enough.
  return !workspaceClerkOrgId || workspaceClerkOrgId === sessionOrgId;
}

/** Whether the school (direction) area can be shown, and whether that is known yet. */
export function useSchoolAdminAccess(): { ready: boolean; canAccess: boolean } {
  const { isLoaded, orgId } = useAuth();
  const workspaceReady = useAppSelector(selectWorkspaceReady);
  const hasOrganizationWorkspace = useAppSelector(selectHasOrganizationWorkspace);
  const isOrganizationAdmin = useAppSelector(selectIsOrganizationAdmin);
  const workspaceClerkOrgId = useAppSelector(selectWorkspaceContext)?.organization?.clerkOrganizationId;

  return {
    ready: isLoaded && workspaceReady,
    canAccess: canAccessSchoolArea({
      hasOrganizationWorkspace,
      isOrganizationAdmin,
      workspaceClerkOrgId,
      sessionOrgId: orgId,
    }),
  };
}
