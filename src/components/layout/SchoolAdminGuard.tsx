"use client";

import { useSchoolAdminAccess } from "@/hooks/useSchoolAdminAccess";
import { Routes } from "@/shared/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SchoolAdminGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  /** Shown until the workspace and the Clerk session are known. */
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const { ready, canAccess } = useSchoolAdminAccess();

  useEffect(() => {
    if (ready && !canAccess) {
      router.replace(Routes.DASHBOARD);
    }
  }, [ready, canAccess, router]);

  if (!ready) return fallback;
  if (!canAccess) return null;

  return children;
}
