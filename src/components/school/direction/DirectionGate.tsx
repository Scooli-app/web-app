"use client";

import { useFeatureAccess } from "@/components/feature/useFeatureAccess";
import { Routes } from "@/shared/types";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import type { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The direction pages exist only while their flag is on (`class_state_enabled` unless another selector is given). Shows nothing until the flags have loaded
 * (they start empty on a hard refresh), then sends everyone else back to the school home. A failed flag fetch
 * also lands there: the flag is off, so the usage overview is what that page shows.
 */
export function DirectionGate({
  children,
  flag = selectIsClassStateEnabled,
}: {
  children: React.ReactNode;
  flag?: (state: RootState) => boolean;
}) {
  const router = useRouter();
  const { loaded, enabled } = useFeatureAccess(flag);

  useEffect(() => {
    if (loaded && !enabled) router.replace(Routes.SCHOOL);
  }, [loaded, enabled, router]);

  return loaded && enabled ? children : null;
}
