"use client";

import { Routes } from "@/shared/types";
import { useAppSelector } from "@/store/hooks";
import {
  selectHasOrganizationWorkspace,
  selectIsOrganizationAdmin,
  selectWorkspaceReady,
} from "@/store/workspace/selectors";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SchoolAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const workspaceReady = useAppSelector(selectWorkspaceReady);
  const hasOrganizationWorkspace = useAppSelector(
    selectHasOrganizationWorkspace,
  );
  const isOrganizationAdmin = useAppSelector(selectIsOrganizationAdmin);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    if (!hasOrganizationWorkspace || !isOrganizationAdmin) {
      router.replace(Routes.DASHBOARD);
    }
  }, [hasOrganizationWorkspace, isOrganizationAdmin, router, workspaceReady]);

  if (!workspaceReady || !hasOrganizationWorkspace || !isOrganizationAdmin) {
    return null;
  }

  return children;
}
