/** Pure decisions for where the onboarding flow starts and when Back is available. */
export type StepId = 1 | 2 | 3 | 4 | 5 | 6;

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

/** Steps 5 (baseline questions) and 6 (weekly ritual) come after the first class. */
export const BASELINE_STEP = 5;
export const RITUAL_STEP = 6;

/**
 * While the profile is not saved the flow can only start at step 1 or 2, whatever the
 * draft says. Afterwards it resumes at the class step, or at the baseline / ritual step when a
 * class exists or was skipped (the ritual only when the server saw the teacher reach it).
 */
export function resolveStartStep(input: StartStepInput): StepId {
  if (!input.profileDone || input.mode === "profile") return input.step1Complete ? 2 : 1;
  if (input.lastStep === RITUAL_STEP && (input.hasClass || input.skippedClass)) return RITUAL_STEP;
  if (input.hasClass) return BASELINE_STEP;
  if (input.skippedClass || (input.lastStep !== null && input.lastStep >= BASELINE_STEP)) {
    return input.lastStep === RITUAL_STEP ? RITUAL_STEP : BASELINE_STEP;
  }
  return 3;
}

/**
 * Back is hidden on the first screen, on the week step, and (once a class exists) on the baseline
 * step, whose previous screen is the week step. The ritual step can always go back to the baseline.
 */
export function canGoBackFrom(input: {
  stepIndex: number;
  step: StepId;
  classExists: boolean;
}): boolean {
  return (
    input.stepIndex > 0 &&
    !(input.step >= 3 && input.step <= BASELINE_STEP && input.classExists) &&
    input.step !== 4
  );
}
