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
  // Stable session ID for the current tutorial run — lets PostHog funnels be
  // scoped to a single run rather than just a person.
  const sessionIdRef = useRef<string | null>(null);
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
        posthog.capture("tutorial_abandoned", {
          tutorial_session_id: sessionIdRef.current,
          step: currentStep + 1,
        });
      }
      completedRef.current = false;
      confirmedOnRouteRef.current = false;
      sessionIdRef.current = null;
    }
  }, [pathname, isTutorialActive, currentStep]);

  const startTutorial = useCallback(() => {
    completedRef.current = false;
    const sessionId = crypto.randomUUID();
    sessionIdRef.current = sessionId;
    setCurrentStep(0);
    setIsTutorialActive(true);
    posthog.capture("tutorial_started", { tutorial_session_id: sessionId });
    posthog.capture("tutorial_step_viewed", { tutorial_session_id: sessionId, step: 1 });
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const stepNumber = prev + 1; // 1-based for events
      posthog.capture("tutorial_step_completed", {
        tutorial_session_id: sessionIdRef.current,
        step: stepNumber,
      });
      const next = prev + 1;
      if (next >= TUTORIAL_TOTAL_STEPS) {
        completedRef.current = true;
        setIsTutorialActive(false);
        posthog.capture("tutorial_completed", {
          tutorial_session_id: sessionIdRef.current,
          steps_total: TUTORIAL_TOTAL_STEPS,
        });
        sessionIdRef.current = null;
        return 0;
      }
      posthog.capture("tutorial_step_viewed", {
        tutorial_session_id: sessionIdRef.current,
        step: next + 1, // next is 0-based index, +1 for display
      });
      return next;
    });
  }, []);

  const exitTutorial = useCallback(
    (reason: "completed" | "skipped" = "skipped") => {
      const alreadyCompleted = completedRef.current;
      completedRef.current = reason === "completed";
      setIsTutorialActive(false);
      setCurrentStep(0);
      if (reason === "skipped") {
        posthog.capture("tutorial_skipped", {
          tutorial_session_id: sessionIdRef.current,
          step: currentStep + 1,
        });
      } else if (!alreadyCompleted) {
        // Guard against double-fire when nextStep() already fired tutorial_completed
        posthog.capture("tutorial_completed", {
          tutorial_session_id: sessionIdRef.current,
          steps_total: TUTORIAL_TOTAL_STEPS,
        });
      }
      sessionIdRef.current = null;
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
