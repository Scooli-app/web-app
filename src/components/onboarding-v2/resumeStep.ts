/** Pure decisions for where the onboarding flow starts and when Back is available. */
/** 1 school and role, 2 what you teach, 3 first class, 4 the wait screen (plan progress + last questions). */
export type StepId = 1 | 2 | 3 | 4;

export interface StartStepInput {
  mode: "full" | "profile";
  /** Mandatory profile saved via POST /onboarding/v2/profile (a draft role does not count). */
  profileDone: boolean;
  hasClass: boolean;
  /** Last step the server saw in a draft save. */
  lastStep: number | null;
  /** The teacher chose "skip" on the class step. */
  skippedClass: boolean;
  /** Role + school (or "no school") are already answered in the draft. */
  step1Complete: boolean;
}

const MIN_SCHOOL_LENGTH = 2;

export function isStepOneComplete(answers: {
  role: string | null;
  schoolName: string;
  noSchool: boolean;
}): boolean {
  return (
    answers.role !== null &&
    (answers.noSchool || answers.schoolName.trim().length >= MIN_SCHOOL_LENGTH)
  );
}

/**
 * The steps a flow shows. A teacher the school invited already has the school and role from the
 * invitation, so "Onde dás aulas?" (step 1) is left out.
 */
export function onboardingSteps(mode: "full" | "profile", invitedTeacher: boolean): StepId[] {
  const steps: StepId[] = mode === "profile" ? [1, 2] : [1, 2, 3, 4];
  return invitedTeacher ? steps.filter((step) => step !== 1) : steps;
}

/** The wait screen: the plan's progress and the last questions (the old steps 4–6). */
export const WAIT_STEP = 4;

/**
 * While the profile is not saved the flow can only start at step 1 or 2, whatever the
 * draft says. Afterwards it resumes at the class step, or at the wait screen once a class exists,
 * was skipped, or the server saw the teacher get there (old flows' steps 5–6 included).
 */
export function resolveStartStep(input: StartStepInput): StepId {
  if (!input.profileDone || input.mode === "profile") return input.step1Complete ? 2 : 1;
  if (input.hasClass || input.skippedClass || (input.lastStep !== null && input.lastStep >= WAIT_STEP)) {
    return WAIT_STEP;
  }
  return 3;
}

/**
 * Back is hidden on the first screen and, once a class exists, on the class and wait steps (the
 * class can't be un-created). Without a class the wait screen goes back to the class step.
 */
export function canGoBackFrom(input: {
  stepIndex: number;
  step: StepId;
  classExists: boolean;
}): boolean {
  return input.stepIndex > 0 && !(input.step >= 3 && input.classExists);
}
