"use client";

import { usePlanGeneration } from "@/components/onboarding-v2/usePlanGeneration";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type { OnboardingV2Status, TeacherRole } from "@/shared/types/onboarding-v2";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useState } from "react";

export type OnboardingStepId = 1 | 2 | 3 | 4 | 5;
export type OnboardingMode = Exclude<OnboardingV2Status["mode"], "none">;

export interface OnboardingAnswers {
  schoolName: string;
  noSchool: boolean;
  role: TeacherRole | null;
  years: number[];
  subjectIds: string[];
  /** Set once the first class exists: from then on Back is hidden. */
  timetableId: string | null;
  skippedClass: boolean;
}

const INITIAL_ANSWERS: OnboardingAnswers = {
  schoolName: "",
  noSchool: false,
  role: null,
  years: [],
  subjectIds: [],
  timetableId: null,
  skippedClass: false,
};

interface UseOnboardingV2Options {
  mode: OnboardingMode;
  /** Mandatory profile already saved (reload after step 2): resume at step 3. */
  profileDone: boolean;
  /** A class already exists (reload after step 3/4): resume at the ritual step. */
  hasClass?: boolean;
}

/** Step navigation, answers and analytics for the onboarding flow. */
export function useOnboardingV2({
  mode,
  profileDone,
  hasClass = false,
}: UseOnboardingV2Options) {
  const steps = useMemo<OnboardingStepId[]>(
    () => (mode === "profile" ? [1, 2] : [1, 2, 3, 4, 5]),
    [mode],
  );
  const firstIndex = mode === "full" && profileDone ? (hasClass ? 4 : 2) : 0;

  const [index, setIndex] = useState(firstIndex);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ANSWERS);

  const step = steps[index];
  // Owned here so leaving step 4 never cancels the topic/week generation.
  const generation = usePlanGeneration();

  const update = useCallback((patch: Partial<OnboardingAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }, []);

  // Resuming after a reload: steps 1–2 are already saved and never re-asked,
  // but step 3 still wants to prefill from the saved years and subjects.
  useEffect(() => {
    if (!(mode === "full" && profileDone)) return;
    let cancelled = false;
    teachingProfileService
      .get()
      .then((profile) => {
        if (cancelled) return;
        update({
          years: [...profile.schoolYears].sort((a, b) => a - b),
          subjectIds: profile.items
            .filter((item) => item.kind === "subject" && item.qualificationCode === null)
            .map((item) => item.code),
        });
      })
      .catch(() => {
        // Step 3 falls back to the full catalogue.
      });
    return () => {
      cancelled = true;
    };
  }, [mode, profileDone, update]);

  useEffect(() => {
    posthog.capture("onboarding_v2_step_viewed", { step, mode });
  }, [step, mode]);

  const goTo = useCallback(
    (target: OnboardingStepId) => {
      const targetIndex = steps.indexOf(target);
      if (targetIndex < 0) return;
      setDirection(targetIndex >= index ? 1 : -1);
      setIndex(targetIndex);
    },
    [steps, index],
  );

  const next = useCallback(() => {
    if (index >= steps.length - 1) return;
    setDirection(1);
    setIndex(index + 1);
  }, [index, steps.length]);

  const back = useCallback(() => {
    if (index <= firstIndex) return;
    // After a skipped class the previous screen is step 3, not the (skipped) step 4.
    const target = step === 5 && answers.skippedClass ? steps.indexOf(3) : index - 1;
    setDirection(-1);
    setIndex(target);
  }, [index, firstIndex, step, answers.skippedClass, steps]);

  /** Back is hidden on the first screen, once a class exists, and on the week step. */
  const canGoBack =
    index > firstIndex && !(step >= 3 && answers.timetableId !== null) && step !== 4;

  const trackCompleted = useCallback(
    (completedStep: OnboardingStepId, props: Record<string, unknown> = {}) => {
      posthog.capture("onboarding_v2_step_completed", { step: completedStep, ...props });
    },
    [],
  );

  return {
    mode,
    steps,
    step,
    stepIndex: index,
    direction,
    answers,
    update,
    goTo,
    next,
    back,
    canGoBack,
    trackCompleted,
    generation,
  };
}

export type OnboardingFlowController = ReturnType<typeof useOnboardingV2>;
