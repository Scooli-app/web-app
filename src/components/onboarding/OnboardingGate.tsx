"use client";

import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { TUTORIAL_ROUTE, useTutorial } from "@/contexts/TutorialContext";
import { onboardingService } from "@/services/api/onboarding.service";
import { Routes } from "@/shared/types";
import {
  ONBOARDING_PROMPT_KEY,
  type OnboardingSubmitRequest,
} from "@/shared/types/onboarding";
import { useAppDispatch } from "@/store/hooks";
import { setOnboardingStatus } from "@/store/onboarding/onboardingSlice";
import type { RootState } from "@/store/store";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { startTutorial } = useTutorial();
  const isUpgradeModalOpen = useSelector(
    (state: RootState) => state.ui.isUpgradeModalOpen,
  );
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  // Status is pre-loaded by AppBootstrapGate — available synchronously on mount
  const onboardingStatus = useSelector(
    (state: RootState) => state.onboarding.status,
  );

  const [open, setOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const hasTrackedViewRef = useRef(false);

  const isRouteSuppressed = useMemo(
    () => pathname === Routes.SUPPORT || pathname.startsWith(Routes.ADMIN),
    [pathname],
  );

  // Open as soon as the pre-loaded status says shouldShow and nothing blocks it.
  // Re-evaluated whenever the route or upgrade modal state changes so it
  // correctly defers when the user is on a suppressed route.
  useEffect(() => {
    if (
      open ||
      !onboardingStatus?.shouldShow ||
      isRouteSuppressed ||
      isUpgradeModalOpen
    ) {
      return;
    }
    setOpen(true);
  }, [
    onboardingStatus?.shouldShow,
    open,
    isRouteSuppressed,
    isUpgradeModalOpen,
  ]);

  // Close and clear shouldShow when the user navigates to a suppressed route
  // while the modal is open, or when the upgrade modal opens on top of it.
  useEffect(() => {
    if (!open) {
      return;
    }
    if (isRouteSuppressed || isUpgradeModalOpen) {
      setOpen(false);
    }
  }, [isRouteSuppressed, isUpgradeModalOpen, open]);

  useEffect(() => {
    if (!open) {
      hasTrackedViewRef.current = false;
      return;
    }

    if (hasTrackedViewRef.current) {
      return;
    }

    hasTrackedViewRef.current = true;

    void onboardingService
      .markViewed(ONBOARDING_PROMPT_KEY)
      .then((nextStatus) => {
        dispatch(setOnboardingStatus(nextStatus));
        posthog.capture("onboarding_viewed", {
          promptKey: nextStatus.promptKey,
          shownCount: nextStatus.shownCount,
        });
      })
      .catch((error) => {
        posthog.captureException(error);
      });
  }, [dispatch, open]);

  const handleSkip = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      const nextStatus = await onboardingService.skip(ONBOARDING_PROMPT_KEY);
      dispatch(setOnboardingStatus(nextStatus));
      setOpen(false);
      // Step-level event fired in OnboardingModal before this callback runs
    } catch (error) {
      posthog.captureException(error);
      toast.error("Não foi possível ignorar o onboarding.");
    } finally {
      setIsBusy(false);
    }
  }, [dispatch, isBusy]);

  const handleSubmit = useCallback(
    async (payload: OnboardingSubmitRequest) => {
      if (isBusy) {
        return;
      }

      setIsBusy(true);
      try {
        await onboardingService.submit(payload);

        dispatch(setOnboardingStatus(null));
        setOpen(false);

        posthog.capture("onboarding_completed", {
          acquisitionSource: payload.acquisitionSource,
          subjectArea: payload.subjectArea ?? null,
          teachingLevel: payload.teachingLevel ?? null,
        });

        posthog.setPersonPropertiesForFlags({
          acquisition_source: payload.acquisitionSource,
        });

        // Only show the first-time tutorial for brand-new users.
        // Users who already have documents know the product — skip straight to dashboard.
        if (!onboardingStatus?.hasDocuments) {
          router.push(TUTORIAL_ROUTE);
          startTutorial();
        }
      } catch (error) {
        posthog.captureException(error);
        toast.error("Não foi possível guardar a tua resposta.");
      } finally {
        setIsBusy(false);
      }
    },
    [dispatch, isBusy, onboardingStatus?.hasDocuments, router, startTutorial],
  );

  if (!isSignedIn || !user?.id || !onboardingStatus) {
    return null;
  }

  return (
    <OnboardingModal
      open={open}
      isBusy={isBusy}
      onSkip={handleSkip}
      onSubmit={handleSubmit}
    />
  );
}
