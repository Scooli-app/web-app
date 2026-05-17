"use client";

import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { onboardingService } from "@/services/api/onboarding.service";
import { Routes } from "@/shared/types";
import {
  ONBOARDING_PROMPT_KEY,
  type OnboardingStatusResponse,
  type OnboardingSubmitRequest,
} from "@/shared/types/onboarding";
import type { RootState } from "@/store/store";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

const OPEN_DELAY_MS = 1200;

export function OnboardingGate() {
  const pathname = usePathname();
  const isUpgradeModalOpen = useSelector(
    (state: RootState) => state.ui.isUpgradeModalOpen,
  );
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatusResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [uiRevision, setUiRevision] = useState(0);

  const hasTrackedViewRef = useRef(false);

  const isRouteSuppressed = useMemo(
    () =>
      pathname === Routes.SUPPORT || pathname.startsWith(Routes.ADMIN),
    [pathname],
  );

  const hasBlockingUi = useCallback(() => {
    if (typeof document === "undefined") {
      return true;
    }

    if (isRouteSuppressed || isUpgradeModalOpen) {
      return true;
    }

    const appBootstrapOverlay = document.querySelector(
      '[role="status"][aria-busy="true"]',
    );
    if (appBootstrapOverlay) {
      return true;
    }

    const otherOpenDialogs = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]'),
    ).some(
      (element) =>
        !element.hasAttribute("data-onboarding-modal") &&
        !element.hasAttribute("data-feedback-survey-modal"),
    );

    return otherOpenDialogs;
  }, [isRouteSuppressed, isUpgradeModalOpen]);

  const loadStatus = useCallback(async () => {
    if (!isAuthLoaded || !isUserLoaded || !isSignedIn || !user?.id) {
      return;
    }

    try {
      const status = await onboardingService.getStatus();
      setOnboardingStatus(status);
      setPendingOpen(status.shouldShow);

      if (!status.shouldShow) {
        setOpen(false);
      }
    } catch (error) {
      posthog.captureException(error);
    }
  }, [isAuthLoaded, isSignedIn, isUserLoaded, user?.id]);

  useEffect(() => {
    if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
      return;
    }

    if (!isSignedIn || !user?.id) {
      setOnboardingStatus(null);
      setOpen(false);
      setPendingOpen(false);
      setIsBusy(false);
      return;
    }

    void loadStatus();
  }, [isAuthLoaded, isSignedIn, isUserLoaded, loadStatus, user?.id]);

  useEffect(() => {
    if (typeof document === "undefined" || !pendingOpen || open) {
      return;
    }

    const observer = new MutationObserver(() => {
      setUiRevision((current) => current + 1);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "aria-busy"],
    });

    return () => observer.disconnect();
  }, [open, pendingOpen]);

  useEffect(() => {
    if (!pendingOpen || open || !onboardingStatus?.shouldShow) {
      return;
    }

    if (hasBlockingUi()) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (hasBlockingUi()) {
        return;
      }

      setOpen(true);
    }, OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [hasBlockingUi, open, pendingOpen, onboardingStatus?.shouldShow, uiRevision]);

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
        setOnboardingStatus(nextStatus);
        posthog.capture("onboarding_viewed", {
          promptKey: nextStatus.promptKey,
          shownCount: nextStatus.shownCount,
        });
      })
      .catch((error) => {
        posthog.captureException(error);
      });
  }, [open]);

  const handleSkip = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      await onboardingService.skip(ONBOARDING_PROMPT_KEY);
      setOpen(false);
      setPendingOpen(false);
      posthog.capture("onboarding_skipped");
    } catch (error) {
      posthog.captureException(error);
      toast.error("Não foi possível ignorar o onboarding.");
    } finally {
      setIsBusy(false);
    }
  }, [isBusy]);

  const handleSubmit = useCallback(
    async (payload: OnboardingSubmitRequest) => {
      if (isBusy) {
        return;
      }

      setIsBusy(true);
      try {
        await onboardingService.submit(payload);

        setOpen(false);
        setPendingOpen(false);

        posthog.capture("onboarding_completed", {
          acquisitionSource: payload.acquisitionSource,
          subjectArea: payload.subjectArea ?? null,
          teachingLevel: payload.teachingLevel ?? null,
        });

        posthog.setPersonPropertiesForFlags({
          acquisition_source: payload.acquisitionSource,
        });
      } catch (error) {
        posthog.captureException(error);
        toast.error("Não foi possível guardar a tua resposta.");
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy],
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
