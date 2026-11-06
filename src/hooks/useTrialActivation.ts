"use client";

import { setPlanLimits } from "@/hooks/usePlanLimits";
import { meService } from "@/services/api/me.service";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { fetchEntitlements } from "@/store/entitlements/entitlementsSlice";
import { useAppDispatch } from "@/store/hooks";
import { fetchUsage } from "@/store/subscription/subscriptionSlice";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";

/**
 * Starts the Pro trial (with the campaign token, or in-app without one) and refreshes everything
 * that depends on the plan, so the lock lifts and Pro features unlock without a reload.
 */
export function useTrialActivation() {
  const { userId } = useAuth();
  const dispatch = useAppDispatch();
  const [activating, setActivating] = useState(false);

  const activate = useCallback(
    async (token?: string): Promise<PlanLimits> => {
      setActivating(true);
      try {
        const limits = await meService.activateTrial(token);
        setPlanLimits(userId, limits);
        void dispatch(fetchEntitlements());
        void dispatch(fetchUsage());
        return limits;
      } finally {
        setActivating(false);
      }
    },
    [dispatch, userId],
  );

  return { activate, activating };
}
