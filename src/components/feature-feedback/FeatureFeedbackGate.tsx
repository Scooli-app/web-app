"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { toast } from "sonner";

import { FeatureFeedbackCard } from "@/components/feature-feedback/FeatureFeedbackCard";
import { feedbackSurveyService } from "@/services/api/feedback-survey.service";
import { featureFeedbackTrigger } from "@/store/featureFeedbackTrigger";
import { UpgradeLimitError } from "@/services/api/client";
import { Routes } from "@/shared/types";
import {
  FEATURES_FEEDBACK_PROMPT_KEY,
  type FeedbackSurveySentiment,
} from "@/shared/types/feedbackSurvey";
import {
  selectIsCurriculumPlanEnabled,
  selectIsHorarioPlanosEnabled,
} from "@/store/features/selectors";
import type { RootState } from "@/store/store";

/** Completions the user must have racked up before we ask. */
const MIN_COMPLETIONS = 2;
/** Delay after a completion event before the card slides in. */
const OPEN_DELAY_MS = 2000;

export function FeatureFeedbackGate() {
  const pathname = usePathname();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

  const curriculumEnabled = useSelector(selectIsCurriculumPlanEnabled);
  const horarioEnabled = useSelector(selectIsHorarioPlanosEnabled);
  const isUpgradeModalOpen = useSelector(
    (s: RootState) => s.ui.isUpgradeModalOpen,
  );
  const isOnboardingModalOpen = useSelector(
    (s: RootState) => s.ui.isOnboardingModalOpen,
  );

  const [open, setOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  /** Set once the user acts on (or dismisses) the card in this session. */
  const settledThisSessionRef = useRef(false);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasBlockingUi = useCallback(() => {
    if (typeof document === "undefined") return true;
    if (isUpgradeModalOpen || isOnboardingModalOpen) return true;
    if (pathname.startsWith(Routes.ADMIN) || pathname === Routes.SUPPORT) return true;
    // App bootstrap overlay
    if (document.querySelector('[role="status"][aria-busy="true"]')) return true;
    // Onboarding (plain fixed div, not a Radix dialog)
    if (document.querySelector("[data-onboarding-modal]")) return true;
    // Any other open Radix dialog (SlotDialog, upgrade, app feedback survey, …)
    if (document.querySelector('[data-slot="dialog-content"]')) return true;
    return false;
  }, [isUpgradeModalOpen, isOnboardingModalOpen, pathname]);

  const maybeOpen = useCallback(async () => {
    if (
      open ||
      isBusy ||
      settledThisSessionRef.current ||
      !isAuthLoaded ||
      !isSignedIn ||
      (!curriculumEnabled && !horarioEnabled) ||
      featureFeedbackTrigger.completionCount() < MIN_COMPLETIONS ||
      hasBlockingUi()
    ) {
      return;
    }

    try {
      const status = await feedbackSurveyService.getStatus(
        FEATURES_FEEDBACK_PROMPT_KEY,
      );
      if (!status.shouldShow || settledThisSessionRef.current || hasBlockingUi()) {
        return;
      }
      await feedbackSurveyService
        .markViewed({ promptKey: FEATURES_FEEDBACK_PROMPT_KEY })
        .catch(() => undefined);
      setOpen(true);
      posthog.capture("feature_feedback_prompt_shown", {
        prompt_key: FEATURES_FEEDBACK_PROMPT_KEY,
      });
    } catch (error) {
      if (!(error instanceof UpgradeLimitError)) {
        posthog.captureException(error);
      }
    }
  }, [
    open,
    isBusy,
    isAuthLoaded,
    isSignedIn,
    curriculumEnabled,
    horarioEnabled,
    hasBlockingUi,
  ]);

  // Fire on each "value moment" completion, after a short delay.
  useEffect(() => {
    const unsubscribe = featureFeedbackTrigger.subscribe(() => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        void maybeOpen();
      }, OPEN_DELAY_MS);
    });
    return () => {
      unsubscribe();
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [maybeOpen]);

  const handleSubmit = useCallback(
    async (payload: { sentiment: FeedbackSurveySentiment; comment?: string }) => {
      setIsBusy(true);
      settledThisSessionRef.current = true;
      try {
        await feedbackSurveyService.submit({
          promptKey: FEATURES_FEEDBACK_PROMPT_KEY,
          sentiment: payload.sentiment,
          comment: payload.comment,
        });
        posthog.capture("feature_feedback_submitted", {
          prompt_key: FEATURES_FEEDBACK_PROMPT_KEY,
          sentiment: payload.sentiment,
          has_comment: Boolean(payload.comment),
        });
        setOpen(false);
        toast.success("Obrigado pelo feedback!");
      } catch (error) {
        if (!(error instanceof UpgradeLimitError)) {
          posthog.captureException(error);
        }
        toast.error("Não foi possível enviar o feedback. Tenta mais tarde.");
      } finally {
        setIsBusy(false);
      }
    },
    [],
  );

  const handleDismiss = useCallback(async () => {
    setIsBusy(true);
    settledThisSessionRef.current = true;
    try {
      await feedbackSurveyService.snooze({
        promptKey: FEATURES_FEEDBACK_PROMPT_KEY,
      });
      posthog.capture("feature_feedback_snoozed", {
        prompt_key: FEATURES_FEEDBACK_PROMPT_KEY,
      });
    } catch {
      // best-effort
    } finally {
      setOpen(false);
      setIsBusy(false);
    }
  }, []);

  if (!open) return null;

  return (
    <FeatureFeedbackCard
      isBusy={isBusy}
      onSubmit={handleSubmit}
      onDismiss={handleDismiss}
    />
  );
}
