"use client";

import { Celebration } from "@/components/onboarding-v2/Celebration";
import {
  flushDraftKeepalive,
  isDraftLocked,
  lockDrafts,
  queueDraft,
  refreshDraftToken,
} from "@/components/onboarding-v2/onboardingDraft";
import { ProgressRail } from "@/components/onboarding-v2/ProgressRail";
import { FirstClassStep } from "@/components/onboarding-v2/steps/FirstClassStep";
import { SchoolRoleStep } from "@/components/onboarding-v2/steps/SchoolRoleStep";
import { TeachingStep } from "@/components/onboarding-v2/steps/TeachingStep";
import { WaitStep } from "@/components/onboarding-v2/steps/WaitStep";
import { skipsClassStep } from "@/components/onboarding-v2/teachingRules";
import {
  useOnboardingV2,
  type OnboardingMode,
} from "@/components/onboarding-v2/useOnboardingV2";
import {
  FooterContext,
  type FooterDisplay,
  type FooterHandlers,
} from "@/components/onboarding-v2/useStepFooter";
import { Button } from "@/components/ui/button";
import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { cn } from "@/shared/utils/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { OnboardingV2DraftAnswers } from "@/shared/types/onboarding-v2";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import posthog from "posthog-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface OnboardingFlowResult {
  mode: OnboardingMode;
  skippedClass: boolean;
}

interface OnboardingV2FlowProps {
  mode: OnboardingMode;
  profileDone: boolean;
  hasClass: boolean;
  lastStep?: number | null;
  draft?: OnboardingV2DraftAnswers | null;
  /** Invited by a school as a teacher: the school step is skipped. */
  invitedTeacher?: boolean;
  /** Hidden but kept alive (route suppressed, or the upgrade modal is on top). */
  suspended: boolean;
  onClose: (result: OnboardingFlowResult) => void;
}

export function OnboardingV2Flow({
  mode,
  profileDone,
  hasClass,
  lastStep,
  draft,
  invitedTeacher = false,
  suspended,
  onClose,
}: OnboardingV2FlowProps) {
  const t = useTranslations("onboardingV2");
  const { step: stepVariants } = useMotionSafe();
  const flow = useOnboardingV2({ mode, profileDone, hasClass, lastStep, draft, invitedTeacher });
  const { step, direction, steps, stepIndex, canGoBack, back } = flow;

  const [footer, setFooter] = useState<FooterDisplay | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const handlersRef = useRef<FooterHandlers | null>(null);
  const footerContext = useMemo(() => ({ setDisplay: setFooter, handlersRef }), []);

  // The footer describes the step on screen; a step animating out must not fire again.
  const currentFooter = footer?.stepId === step ? footer : null;

  const handleContinue = useCallback(() => {
    const handlers = handlersRef.current;
    if (!handlers || handlers.stepId !== step) return;
    handlers.onContinue();
  }, [step]);


  const canContinue = !!currentFooter && currentFooter.canContinue && !currentFooter.busy;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" || event.shiftKey || !canContinue) return;
    const target = event.target as HTMLElement;
    if (["BUTTON", "TEXTAREA", "SELECT", "A"].includes(target.tagName)) return;
    event.preventDefault();
    handleContinue();
  };

  const finish = useCallback(() => setCelebrating(true), []);
  const handleCelebrated = useCallback(
    () => onClose({ mode, skippedClass: flow.answers.skippedClass }),
    [onClose, mode, flow.answers.skippedClass],
  );

  // Closing the tab mid-flow: flush the pending draft and record where the teacher left.
  // Not while hidden behind another dialog, nor after Concluir (drafts are locked).
  const abandonedSent = useRef(false);
  useEffect(() => {
    if (celebrating) return;
    const onHide = () => {
      if (isDraftLocked()) return;
      flushDraftKeepalive();
      if (suspended || abandonedSent.current) return;
      abandonedSent.current = true;
      posthog.capture("onboarding_v2_abandoned", { step, mode }, { transport: "sendBeacon" });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else abandonedSent.current = false;
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    // Auth tokens are short-lived; keep one fresh for the keepalive request.
    const refresh = window.setInterval(refreshDraftToken, 45_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.clearInterval(refresh);
    };
  }, [step, mode, suspended, celebrating]);

  const handleProfileSaved = () => {
    if (mode === "profile") {
      void lockDrafts();
      onClose({ mode, skippedClass: false });
    } else if (skipsClassStep(flow.answers.role)) {
      // Pre-school: no curriculum to plan a class from, so straight to the last questions.
      queueDraft({ step: 4, skippedClass: true }, { immediate: true });
      flow.update({ skippedClass: true });
      flow.goTo(4);
    } else flow.next();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <SchoolRoleStep flow={flow} />;
      case 2:
        return <TeachingStep flow={flow} onProfileSaved={handleProfileSaved} />;
      case 3:
        return <FirstClassStep flow={flow} />;
      case 4:
        return <WaitStep flow={flow} onFinished={finish} />;
    }
  };

  return (
    <FooterContext.Provider value={footerContext}>
      <div
        data-onboarding-modal
        // pointer-events-auto is load-bearing: a Radix modal that opens underneath sets
        // pointer-events: none on <body>, which would leave this screen unclickable.
        className={cn(
          "pointer-events-auto fixed inset-x-0 top-0 z-[9999] flex h-dvh flex-col overflow-hidden bg-background",
          suspended && "invisible pointer-events-none",
        )}
        aria-modal="true"
        aria-hidden={suspended}
        role="dialog"
        aria-label={t("dialogLabel")}
        onKeyDown={handleKeyDown}
      >
        <header className="shrink-0 space-y-3 px-4 pb-1 pt-3 sm:px-8 sm:pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scooli.svg" alt="Scooli" className="h-6 w-auto sm:h-7" draggable={false} />
          {!celebrating && (
            <div className="mx-auto w-full max-w-2xl">
              <ProgressRail current={stepIndex + 1} total={steps.length} />
            </div>
          )}
        </header>

        {/* Steps are sized to fit; the longer branches (vocational courses, "O que já deste?") scroll on small screens. */}
        <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto min-h-full w-full max-w-2xl px-4 py-3 sm:py-6">
            {celebrating ? (
              <Celebration onDone={handleCelebrated} />
            ) : (
              // No exit phase: waiting for the old step to animate out (AnimatePresence
              // mode="wait") left the screen blank for seconds. The new step enters immediately.
              <motion.div
                className="h-full"
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="initial"
                animate="animate"
              >
                {renderStep()}
              </motion.div>
            )}
          </div>
        </main>

        {!celebrating && (
          <footer className="shrink-0 border-t border-border bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-8">
            <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
              {canGoBack && !currentFooter?.hideBack && (
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10"
                    onClick={back}
                    disabled={currentFooter?.busy}
                  >
                    <ArrowLeft aria-hidden />
                    {t("back")}
                  </Button>
                </div>
              )}
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  className="h-auto min-h-10 min-w-32 whitespace-normal px-5 py-2 text-base"
                  onClick={handleContinue}
                  disabled={!canContinue}
                >
                  {currentFooter?.busy && <Loader2 className="animate-spin" aria-hidden />}
                  {currentFooter?.continueLabel ?? t("continue")}
                </Button>
              </div>
            </div>
          </footer>
        )}
      </div>
    </FooterContext.Provider>
  );
}
