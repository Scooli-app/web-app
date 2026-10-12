"use client";

import { meService } from "@/services/api/me.service";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { useAppDispatch } from "@/store/hooks";
import { openUpgradeModalForReason } from "@/store/ui/uiSlice";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

// One request per session: every class form and "new class" link shares it.
let cached: Promise<PlanLimits | null> | null = null;

function loadPlanLimits(): Promise<PlanLimits | null> {
  if (!cached) {
    // Fail open: if the limits can't be read the server still enforces them.
    cached = meService.getPlanLimits().catch(() => {
      cached = null;
      return null;
    });
  }
  return cached;
}

const listeners = new Set<() => void>();

/** Call after something changes the limits (a class was created or deleted). */
export function invalidatePlanLimits() {
  cached = null;
  listeners.forEach((refresh) => refresh());
}

export function usePlanLimits(): { limits: PlanLimits | null; loading: boolean } {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      loadPlanLimits().then((value) => {
        if (cancelled) return;
        setLimits(value);
        setLoading(false);
      });
    };
    refresh();
    listeners.add(refresh);
    return () => {
      cancelled = true;
      listeners.delete(refresh);
    };
  }, []);

  return { limits, loading };
}

/** True when a free user already has as many classes as the plan allows. */
export function isClassLimitReached(limits: PlanLimits | null): boolean {
  return (
    !!limits &&
    !limits.isPro &&
    typeof limits.maxActiveClasses === "number" &&
    limits.activeClasses >= limits.maxActiveClasses
  );
}

/**
 * Click handler for every "new class" entry point: at the free-plan class limit it
 * opens the upgrade modal instead of navigating to the form.
 */
export function useNewClassGate() {
  const dispatch = useAppDispatch();
  const { limits } = usePlanLimits();
  const blocked = isClassLimitReached(limits);

  const onClick = useCallback(
    (event: MouseEvent) => {
      if (!blocked) return;
      event.preventDefault();
      dispatch(openUpgradeModalForReason("free_class_limit"));
    },
    [blocked, dispatch]
  );

  return { blocked, onClick };
}
