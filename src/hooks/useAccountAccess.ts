"use client";

import { usePlanLimits } from "@/hooks/usePlanLimits";
import {
  lockUpgradeReason,
  resolveAccountAccess,
  type AccountAccess,
  type GuardedAction,
} from "@/shared/types/plan-limits";
import { useAppDispatch } from "@/store/hooks";
import { openUpgradeModalForReason } from "@/store/ui/uiSlice";
import posthog from "posthog-js";
import { useCallback, useMemo } from "react";

export interface AccountAccessState extends AccountAccess {
  loading: boolean;
  /**
   * Call at the start of a guarded action (generate, export, duplicate, share, print).
   * Returns true when it may run; while the account is read-only it opens the paywall and
   * returns false. Fails open while the plan limits are unknown: the server still refuses.
   */
  guard: (action: GuardedAction) => boolean;
}

/** The read-only lock and the Pro trial (ENG-314), for every action entry point. */
export function useAccountAccess(): AccountAccessState {
  const { limits, loading } = usePlanLimits();
  const dispatch = useAppDispatch();
  const access = useMemo(() => resolveAccountAccess(limits), [limits]);
  const { isLocked, lockReason } = access;

  const guard = useCallback(
    (action: GuardedAction) => {
      if (!isLocked) return true;
      posthog.capture("locked_action_clicked", { action, reason: lockReason });
      dispatch(openUpgradeModalForReason(lockUpgradeReason(lockReason)));
      return false;
    },
    [dispatch, isLocked, lockReason],
  );

  return { ...access, loading, guard };
}
