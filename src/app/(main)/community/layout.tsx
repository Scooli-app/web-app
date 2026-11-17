"use client";

import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { Routes } from "@/shared/types/routes";
import { selectIsCommunityLibraryEnabled } from "@/store/features/selectors";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import CommunityLoading from "./loading";

/**
 * Gates every /community route behind the community_library flag. The library is
 * hidden (not upsold) when the flag is off, so a direct link goes to the dashboard.
 */
export default function CommunityLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loaded, enabled } = useFeatureAccess(selectIsCommunityLibraryEnabled);

  useEffect(() => {
    if (loaded && !enabled) router.replace(Routes.DASHBOARD);
  }, [loaded, enabled, router]);

  if (!loaded || !enabled) return <CommunityLoading />;
  return children;
}
