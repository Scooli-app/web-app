"use client";

import {
  OnboardingV2Flow,
  type OnboardingFlowResult,
} from "@/components/onboarding-v2/OnboardingV2Flow";
import type { OnboardingMode } from "@/components/onboarding-v2/useOnboardingV2";
import { TUTORIAL_ROUTE, useTutorial } from "@/contexts/TutorialContext";
import { onboardingV2Service } from "@/services/api/onboarding-v2.service";
import { Routes } from "@/shared/types";
import type { OnboardingV2Status } from "@/shared/types/onboarding-v2";
import { useAppDispatch } from "@/store/hooks";
import { setOnboardingStatus } from "@/store/onboarding/onboardingSlice";
import type { RootState } from "@/store/store";
import { setOnboardingModalOpen } from "@/store/ui/uiSlice";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

type PendingFlow = { mode: OnboardingMode; profileDone: boolean };

function toPendingFlow(status: OnboardingV2Status): PendingFlow | null {
  return status.mode === "none"
    ? null
    : { mode: status.mode, profileDone: status.profileDone };
}

/**
 * Decides whether the onboarding v2 flow runs and mounts it. Same suppression
 * rules as the v1 gate: it never starts on support/admin routes or while the
 * upgrade modal is open. Once started it stays mounted (so answers survive) and
 * is merely hidden while either of those is on screen.
 */
export function OnboardingV2Gate() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { startTutorial } = useTutorial();
  const { isSignedIn } = useAuth();
  const isUpgradeModalOpen = useSelector(
    (state: RootState) => state.ui.isUpgradeModalOpen,
  );

  const [pending, setPending] = useState<PendingFlow | null>(null);
  const [running, setRunning] = useState(false);
  const fetchedRef = useRef(false);

  const isRouteSuppressed = useMemo(
    () => pathname === Routes.SUPPORT || pathname.startsWith(Routes.ADMIN),
    [pathname],
  );
  const suspended = isRouteSuppressed || isUpgradeModalOpen;

  useEffect(() => {
    if (!isSignedIn || fetchedRef.current) return;
    fetchedRef.current = true;
    onboardingV2Service
      .getStatus()
      .then((status) => setPending(toPendingFlow(status)))
      .catch((error) => posthog.captureException(error));
  }, [isSignedIn]);

  useEffect(() => {
    if (pending && !running && !suspended) setRunning(true);
  }, [pending, running, suspended]);

  // Publish the open state so PromoGate / AppFeedbackSurveyGate hold their dialogs
  // back: a Radix modal opening under the z-9999 flow would swallow every click.
  const visible = running && !suspended;
  useEffect(() => {
    dispatch(setOnboardingModalOpen(visible));
  }, [dispatch, visible]);

  useEffect(
    () => () => {
      dispatch(setOnboardingModalOpen(false));
    },
    [dispatch],
  );

  const handleClose = useCallback(
    (result: OnboardingFlowResult) => {
      setRunning(false);
      setPending(null);
      // The v1 status preloaded at bootstrap is superseded by the v2 completion.
      dispatch(setOnboardingStatus(null));
      if (result.mode !== "full") return;
      if (result.skippedClass) {
        // Brand-new teacher without a class yet: hand over to the first-time tutorial.
        router.push(TUTORIAL_ROUTE);
        startTutorial("onboarding");
      } else {
        router.push(Routes.DASHBOARD);
      }
    },
    [dispatch, router, startTutorial],
  );

  if (!isSignedIn || !pending || !running) return null;

  return (
    <OnboardingV2Flow
      mode={pending.mode}
      profileDone={pending.profileDone}
      suspended={suspended}
      onClose={handleClose}
    />
  );
}
