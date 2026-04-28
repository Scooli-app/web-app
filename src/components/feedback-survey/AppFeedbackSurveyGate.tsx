"use client";

import { AppFeedbackSurveyModal } from "@/components/feedback-survey/AppFeedbackSurveyModal";
import { feedbackSurveyService } from "@/services/api/feedback-survey.service";
import { userService } from "@/services/api/user.service";
import { Routes } from "@/shared/types";
import {
  FeedbackSurveyStatus,
  type FeedbackSurveyStatusResponse,
  type FeedbackSurveySubmitRequest,
} from "@/shared/types/feedbackSurvey";
import type { CurrentUserProfile } from "@/shared/types/user";
import type { RootState } from "@/store/store";
import { differenceInCalendarDays } from "date-fns";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

const STATUS_STALE_MS = 5 * 60 * 1000;
const OPEN_DELAY_MS = 1200;

export function AppFeedbackSurveyGate() {
  const pathname = usePathname();
  const isUpgradeModalOpen = useSelector(
    (state: RootState) => state.ui.isUpgradeModalOpen,
  );
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  const [surveyStatus, setSurveyStatus] =
    useState<FeedbackSurveyStatusResponse | null>(null);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<CurrentUserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [uiRevision, setUiRevision] = useState(0);

  const hasTrackedViewRef = useRef(false);

  const isRouteSuppressed = useMemo(
    () =>
      pathname === Routes.SUPPORT ||
      pathname.startsWith(Routes.ADMIN),
    [pathname],
  );

  const getDaysSinceSignup = useCallback(() => {
    if (!currentUserProfile?.createdAt) {
      return undefined;
    }

    return differenceInCalendarDays(new Date(), new Date(currentUserProfile.createdAt));
  }, [currentUserProfile?.createdAt]);

  const hasBlockingUi = useCallback(() => {
    if (typeof document === "undefined") {
      return true;
    }

    if (isRouteSuppressed || isUpgradeModalOpen) {
      return true;
    }

    const appBootstrapOverlay = document.querySelector('[role="status"][aria-busy="true"]');
    if (appBootstrapOverlay) {
      return true;
    }

    const otherOpenDialogs = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]'),
    ).some((element) => !element.hasAttribute("data-feedback-survey-modal"));

    return otherOpenDialogs;
  }, [isRouteSuppressed, isUpgradeModalOpen]);

  const refreshSurveyStatus = useCallback(async () => {
    if (!isAuthLoaded || !isUserLoaded || !isSignedIn || !user?.id) {
      return;
    }

    const [statusResult, profileResult] = await Promise.allSettled([
      feedbackSurveyService.getStatus(),
      userService.getCurrentUser(),
    ]);

    if (statusResult.status === "fulfilled") {
      setSurveyStatus(statusResult.value);
      setPendingOpen(statusResult.value.shouldShow);
      setLastCheckedAt(Date.now());

      if (!statusResult.value.shouldShow) {
        setOpen(false);
      }
    } else {
      posthog.captureException(statusResult.reason);
    }

    if (profileResult.status === "fulfilled") {
      setCurrentUserProfile(profileResult.value);
    } else {
      posthog.captureException(profileResult.reason);
    }
  }, [isAuthLoaded, isSignedIn, isUserLoaded, user?.id]);

  useEffect(() => {
    if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
      return;
    }

    if (!isSignedIn || !user?.id) {
      setSurveyStatus(null);
      setCurrentUserProfile(null);
      setOpen(false);
      setPendingOpen(false);
      setIsBusy(false);
      setLastCheckedAt(null);
      return;
    }

    void refreshSurveyStatus();
  }, [isAuthLoaded, isSignedIn, isUserLoaded, refreshSurveyStatus, user?.id]);

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
    if (!pendingOpen || open || !surveyStatus?.shouldShow) {
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
  }, [hasBlockingUi, open, pendingOpen, surveyStatus?.shouldShow, uiRevision]);

  useEffect(() => {
    if (!open) {
      hasTrackedViewRef.current = false;
      return;
    }

    if (!surveyStatus?.promptKey || hasTrackedViewRef.current) {
      return;
    }

    hasTrackedViewRef.current = true;

    void feedbackSurveyService
      .markViewed({ promptKey: surveyStatus.promptKey })
      .then((nextStatus) => {
        setSurveyStatus(nextStatus);
        posthog.capture("feedback_survey_viewed", {
          promptKey: nextStatus.promptKey,
          shownCount: nextStatus.shownCount,
          daysSinceSignup: getDaysSinceSignup(),
        });
      })
      .catch((error) => {
        posthog.captureException(error);
      });
  }, [getDaysSinceSignup, open, surveyStatus?.promptKey]);

  useEffect(() => {
    const handleFocus = () => {
      if (open) {
        return;
      }

      if (lastCheckedAt && Date.now() - lastCheckedAt < STATUS_STALE_MS) {
        return;
      }

      void refreshSurveyStatus();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [lastCheckedAt, open, refreshSurveyStatus]);

  const handleMaybeLater = useCallback(async () => {
    if (!surveyStatus?.promptKey || isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      const nextStatus = await feedbackSurveyService.snooze({
        promptKey: surveyStatus.promptKey,
      });

      setSurveyStatus(nextStatus);
      setPendingOpen(false);
      setOpen(false);
      setLastCheckedAt(Date.now());

      posthog.capture("feedback_survey_snoozed", {
        promptKey: nextStatus.promptKey,
        shownCount: nextStatus.shownCount,
        daysSinceSignup: getDaysSinceSignup(),
      });
    } catch (error) {
      posthog.captureException(error);
      toast.error("Não foi possível adiar o pedido de feedback.");
    } finally {
      setIsBusy(false);
    }
  }, [getDaysSinceSignup, isBusy, surveyStatus?.promptKey]);

  const handleSubmit = useCallback(
    async (payload: FeedbackSurveySubmitRequest) => {
      if (isBusy) {
        return;
      }

      setIsBusy(true);
      try {
        await feedbackSurveyService.submit(payload);

        setOpen(false);
        setPendingOpen(false);
        setLastCheckedAt(Date.now());
        setSurveyStatus((current) =>
          current
            ? {
                ...current,
                shouldShow: false,
                status: FeedbackSurveyStatus.COMPLETED,
              }
            : current,
        );

        posthog.capture("feedback_survey_submitted", {
          promptKey: payload.promptKey,
          shownCount: surveyStatus?.shownCount,
          daysSinceSignup: getDaysSinceSignup(),
          sentiment: payload.sentiment,
          selectedTags: payload.selectedTags,
        });

        toast.success("Obrigado pelo teu feedback.");
      } catch (error) {
        posthog.captureException(error);
        toast.error("Não foi possível enviar o feedback.");
      } finally {
        setIsBusy(false);
      }
    },
    [getDaysSinceSignup, isBusy, surveyStatus?.shownCount],
  );

  if (!isSignedIn || !user?.id || !surveyStatus) {
    return null;
  }

  return (
    <AppFeedbackSurveyModal
      open={open}
      isBusy={isBusy}
      onMaybeLater={handleMaybeLater}
      onSubmit={handleSubmit}
    />
  );
}
