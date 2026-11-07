"use client";

import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { Routes } from "@/shared/types";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The direction pages exist only while `class_state_enabled` is on. Shows nothing until the flags have loaded
 * (they start empty on a hard refresh), then sends everyone else back to the school home. A failed flag fetch
 * also lands there: the flag is off, so the usage overview is what that page shows.
 */
export function DirectionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loaded, enabled } = useFeatureAccess(selectIsClassStateEnabled);

  useEffect(() => {
    if (loaded && !enabled) router.replace(Routes.SCHOOL);
  }, [loaded, enabled, router]);

  return loaded && enabled ? children : null;
}
