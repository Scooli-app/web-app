/** Pure decisions for where the onboarding flow starts and when Back is available. */
export type StepId = 1 | 2 | 3 | 4 | 5;

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
 * While the profile is not saved the flow can only start at step 1 or 2, whatever the
 * draft says. Afterwards it resumes at the class step, or at the ritual step when a class
 * exists or was skipped.
 */
export function resolveStartStep(input: StartStepInput): StepId {
  if (!input.profileDone || input.mode === "profile") return input.step1Complete ? 2 : 1;
  if (input.hasClass) return 5;
  if (input.skippedClass || input.lastStep === 5) return 5;
  return 3;
}

/** Back is hidden on the first screen, once a class exists, and on the week step. */
export function canGoBackFrom(input: {
  stepIndex: number;
  step: StepId;
  classExists: boolean;
}): boolean {
  return input.stepIndex > 0 && !(input.step >= 3 && input.classExists) && input.step !== 4;
}
