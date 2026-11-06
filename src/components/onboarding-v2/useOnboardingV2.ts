"use client";

import {
  canGoBackFrom,
  isStepOneComplete,
  onboardingSteps,
  resolveStartStep,
  WAIT_STEP,
  type StepId,
} from "@/components/onboarding-v2/resumeStep";
import { skipsClassStep } from "@/components/onboarding-v2/teachingRules";
import { usePlanGeneration } from "@/components/onboarding-v2/usePlanGeneration";
import { flushDraft, queueDraft, resetDraft } from "@/components/onboarding-v2/onboardingDraft";
import {
  persistStepTwoSelection,
  readStepTwoSelection,
} from "@/components/onboarding-v2/onboardingStorage";
import {
  applyRitualPatch,
  initialRitualState,
  ritualDraftPatch,
  type RitualState,
} from "@/components/onboarding-v2/ritualState";
import { teachingProfileService } from "@/services/api/teaching-profile.service";
import type {
  OnboardingV2DraftAnswers,
  OnboardingV2Status,
  TeacherRole,
} from "@/shared/types/onboarding-v2";
import type { TeachingItem } from "@/shared/types/teaching-profile";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type OnboardingStepId = StepId;
export type OnboardingMode = Exclude<OnboardingV2Status["mode"], "none">;

/** What the wait screen narrates about the class just created. */
export interface FirstClassSummary {
  subjectLabel: string;
  year: number;
  /** Topics the teacher ticked as already taught. */
  taught: string[];
}

export interface OnboardingAnswers {
  schoolName: string;
  noSchool: boolean;
  role: TeacherRole | null;
  years: number[];
  subjectIds: string[];
  /** Vocational teachers: the courses and the UCs picked in step 2. */
  courses: string[];
  units: TeachingItem[];
  /** Set once the first class exists: from then on Back is hidden. */
  timetableId: string | null;
  firstClass: FirstClassSummary | null;
  skippedClass: boolean;
}

const INITIAL_ANSWERS: OnboardingAnswers = {
  schoolName: "",
  noSchool: false,
  role: null,
  years: [],
  subjectIds: [],
  courses: [],
  units: [],
  timetableId: null,
  firstClass: null,
  skippedClass: false,
};

interface UseOnboardingV2Options {
  mode: OnboardingMode;
  /** Mandatory profile already saved (reload after step 2): resume at step 3. */
  profileDone: boolean;
  /** A class already exists (reload after step 3): resume at the wait screen. */
  hasClass?: boolean;
  /** Last step the server saw, and the answers saved so far. */
  lastStep?: number | null;
  draft?: OnboardingV2DraftAnswers | null;
  /** Invited by a school as a teacher: school and role come from the invitation. */
  invitedTeacher?: boolean;
}

/** Step navigation, answers and analytics for the onboarding flow. */
export function useOnboardingV2({
  mode,
  profileDone,
  hasClass = false,
  lastStep = null,
  draft = null,
  invitedTeacher = false,
}: UseOnboardingV2Options) {
  const steps = useMemo<OnboardingStepId[]>(
    () => onboardingSteps(mode, invitedTeacher),
    [mode, invitedTeacher],
  );
  // Steps 1–2 are only "done" once the profile is saved (a draft role doesn't count), so
  // until then the flow starts at step 1 or 2 and never past it. See resolveStartStep.
  const startStep = resolveStartStep({
    mode,
    profileDone,
    hasClass,
    lastStep,
    skippedClass: false,
    step1Complete: isStepOneComplete({
      role: draft?.teacherRole ?? null,
      schoolName: draft?.schoolName ?? "",
      noSchool: draft?.noSchool ?? false,
    }),
  });
  // Reloaded on the wait screen without a class: the class was skipped (or pre-school).
  const resumeAtWait = mode === "full" && startStep === WAIT_STEP && !hasClass;
  const startIndex = steps.indexOf(startStep);

  const [index, setIndex] = useState(Math.max(startIndex, 0));
  const [direction, setDirection] = useState<1 | -1>(1);
  const { getToken, userId } = useAuth();
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => {
    // Step 2 isn't saved server-side until Continue: restore a refresh from localStorage.
    const stored = profileDone ? null : readStepTwoSelection(userId);
    return {
    ...INITIAL_ANSWERS,
    years: stored?.years ?? [],
    subjectIds: stored?.subjectIds ?? [],
    schoolName: draft?.schoolName ?? "",
    noSchool: draft?.noSchool ?? false,
    role: draft?.teacherRole ?? null,
    skippedClass: resumeAtWait,
    };
  });

  const selectionEdited = useRef(false);
  useEffect(() => {
    persistStepTwoSelection(
      userId,
      { years: answers.years, subjectIds: answers.subjectIds },
      { profileDone, edited: selectionEdited.current },
    );
  }, [profileDone, userId, answers.years, answers.subjectIds]);

  // Seed the autosave with what the server already holds, so prefilled values are
  // never re-sent. Runs once per flow instance.
  useEffect(() => {
    resetDraft(() => getToken(), draft, lastStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The wait screen's answers live here so Back → return never loses them, and every change is queued
  // for autosave from the handler (not from an effect that unmounting would skip).
  const [ritual, setRitual] = useState<RitualState>(() => initialRitualState(draft));
  const ritualRef = useRef(ritual);
  const updateRitual = useCallback((patch: Partial<RitualState>) => {
    const nextState = applyRitualPatch(ritualRef.current, patch);
    ritualRef.current = nextState;
    setRitual(nextState);
    queueDraft(ritualDraftPatch(nextState, WAIT_STEP));
  }, []);

  const step = steps[index];
  // Owned here so leaving the wait screen never cancels the topic/week generation.
  const generation = usePlanGeneration();

  const update = useCallback((patch: Partial<OnboardingAnswers>) => {
    if (patch.years !== undefined || patch.subjectIds !== undefined) {
      selectionEdited.current = true;
    }
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
          courses: profile.courses,
          units: profile.items.filter((item) => item.kind === "unit" && item.qualificationCode !== null),
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
    // Remember how far the teacher got (steps 1–2 save their own answers).
    if (mode === "full" && step >= 3) queueDraft({ step });
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
    if (index <= 0) return;
    // Without a class the wait screen goes back to the class step (pre-school: to what they teach).
    const target =
      step === WAIT_STEP && answers.skippedClass
        ? steps.indexOf(skipsClassStep(answers.role) ? 2 : 3)
        : index - 1;
    // Leaving the wait screen: send its debounced draft now.
    if (step === WAIT_STEP) void flushDraft();
    setDirection(-1);
    setIndex(target);
  }, [index, step, answers.skippedClass, answers.role, steps]);

  /** Back is hidden on the first screen and, once a class exists, on the class and wait steps. */
  const canGoBack = canGoBackFrom({
    stepIndex: index,
    step,
    classExists: answers.timetableId !== null || hasClass,
  });

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
    draft,
    update,
    ritual,
    updateRitual,
    goTo,
    next,
    back,
    canGoBack,
    trackCompleted,
    generation,
  };
}

export type OnboardingFlowController = ReturnType<typeof useOnboardingV2>;
