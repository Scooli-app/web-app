"use client";

import { Celebration } from "@/components/onboarding-v2/Celebration";
import { ProgressRail } from "@/components/onboarding-v2/ProgressRail";
import { FirstClassStep } from "@/components/onboarding-v2/steps/FirstClassStep";
import { FirstWeekStep } from "@/components/onboarding-v2/steps/FirstWeekStep";
import { RitualStep } from "@/components/onboarding-v2/steps/RitualStep";
import { SchoolRoleStep } from "@/components/onboarding-v2/steps/SchoolRoleStep";
import { TeachingStep } from "@/components/onboarding-v2/steps/TeachingStep";
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
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";

export interface OnboardingFlowResult {
  mode: OnboardingMode;
  skippedClass: boolean;
}

interface OnboardingV2FlowProps {
  mode: OnboardingMode;
  profileDone: boolean;
  hasClass: boolean;
  /** Hidden but kept alive (route suppressed, or the upgrade modal is on top). */
  suspended: boolean;
  onClose: (result: OnboardingFlowResult) => void;
}

export function OnboardingV2Flow({
  mode,
  profileDone,
  hasClass,
  suspended,
  onClose,
}: OnboardingV2FlowProps) {
  const t = useTranslations("onboardingV2");
  const { step: stepVariants } = useMotionSafe();
  const flow = useOnboardingV2({ mode, profileDone, hasClass });
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

  const handleSecondary = useCallback(() => {
    const handlers = handlersRef.current;
    if (!handlers || handlers.stepId !== step) return;
    handlers.onSecondary?.();
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

  const handleProfileSaved = () => {
    if (mode === "profile") onClose({ mode, skippedClass: false });
    else flow.next();
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
        return <FirstWeekStep flow={flow} />;
      case 5:
        return <RitualStep flow={flow} onFinished={finish} />;
    }
  };

  return (
    <FooterContext.Provider value={footerContext}>
      <div
        data-onboarding-modal
        // pointer-events-auto is load-bearing: a Radix modal that opens underneath sets
        // pointer-events: none on <body>, which would leave this screen unclickable.
        className={cn(
          "pointer-events-auto fixed inset-0 z-[9999] flex flex-col overscroll-contain bg-background",
          suspended && "invisible pointer-events-none",
        )}
        aria-modal="true"
        aria-hidden={suspended}
        role="dialog"
        aria-label={t("dialogLabel")}
        onKeyDown={handleKeyDown}
      >
        <header className="shrink-0 space-y-4 px-4 pb-2 pt-4 sm:px-8 sm:pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/scooli.svg" alt="Scooli" className="h-7 w-auto" draggable={false} />
          {!celebrating && (
            <div className="mx-auto w-full max-w-xl">
              <ProgressRail current={stepIndex + 1} total={steps.length} />
            </div>
          )}
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-10">
            {celebrating ? (
              <Celebration onDone={handleCelebrated} />
            ) : (
              // No exit phase: waiting for the old step to animate out (AnimatePresence
              // mode="wait") left the screen blank for seconds while step 4's
              // streaming rows were still animating. The new step enters immediately.
              <motion.div
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
          <footer className="shrink-0 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
            <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
              {canGoBack && !currentFooter?.hideBack && (
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11"
                    onClick={back}
                    disabled={currentFooter?.busy}
                  >
                    <ArrowLeft aria-hidden />
                    {t("back")}
                  </Button>
                </div>
              )}
              <div className="ml-auto flex min-w-0 items-center gap-2">
                {currentFooter?.secondaryLabel && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 px-4"
                    onClick={handleSecondary}
                    disabled={currentFooter.busy}
                  >
                    {currentFooter.secondaryLabel}
                  </Button>
                )}
                <Button
                  type="button"
                  className="h-auto min-h-11 min-w-32 whitespace-normal px-5 py-2 text-base"
                  onClick={handleContinue}
                  disabled={!canContinue}
                >
                  {currentFooter?.busy && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
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
