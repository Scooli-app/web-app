"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const TUTORIAL_ROUTE = "/quiz";
export const TUTORIAL_TOTAL_STEPS = 5;

interface TutorialContextValue {
  isTutorialActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTutorial: () => void;
  nextStep: () => void;
  exitTutorial: (reason?: "completed" | "skipped") => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const pathname = usePathname();
  // Track whether the tutorial was explicitly completed vs navigated away
  const completedRef = useRef(false);
  // Only auto-exit once the tutorial has been confirmed active on the tutorial route.
  // This prevents a race condition where startTutorial() is called on the onboarding
  // page before router.push('/quiz') completes, which would otherwise trigger an
  // immediate auto-exit because pathname hasn't updated yet.
  const confirmedOnRouteRef = useRef(false);

  // Auto-exit if user navigates away from the quiz page
  useEffect(() => {
    if (!isTutorialActive) {
      confirmedOnRouteRef.current = false;
      return;
    }

    if (pathname.startsWith(TUTORIAL_ROUTE)) {
      // Confirmed we're on the right route while active
      confirmedOnRouteRef.current = true;
      return;
    }

    // Only exit if we've already been on the tutorial route (user navigated away)
    if (confirmedOnRouteRef.current) {
      setIsTutorialActive(false);
      setCurrentStep(0);
      if (!completedRef.current) {
        posthog.capture("tutorial_abandoned", { step: currentStep });
      }
      completedRef.current = false;
      confirmedOnRouteRef.current = false;
    }
  }, [pathname, isTutorialActive, currentStep]);

  const startTutorial = useCallback(() => {
    completedRef.current = false;
    setCurrentStep(0);
    setIsTutorialActive(true);
    posthog.capture("tutorial_started");
    posthog.capture("tutorial_step_viewed", { step: 0 });
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      posthog.capture("tutorial_step_completed", { step: prev });
      const next = prev + 1;
      if (next >= TUTORIAL_TOTAL_STEPS) {
        completedRef.current = true;
        setIsTutorialActive(false);
        posthog.capture("tutorial_completed");
        return 0;
      }
      posthog.capture("tutorial_step_viewed", { step: next });
      return next;
    });
  }, []);

  const exitTutorial = useCallback(
    (reason: "completed" | "skipped" = "skipped") => {
      completedRef.current = reason === "completed";
      setIsTutorialActive(false);
      setCurrentStep(0);
      if (reason === "skipped") {
        posthog.capture("tutorial_skipped", { step: currentStep });
      } else {
        posthog.capture("tutorial_completed");
      }
    },
    [currentStep],
  );

  return (
    <TutorialContext.Provider
      value={{
        isTutorialActive,
        currentStep,
        totalSteps: TUTORIAL_TOTAL_STEPS,
        startTutorial,
        nextStep,
        exitTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within a TutorialProvider");
  return ctx;
}
