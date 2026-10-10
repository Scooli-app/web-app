/** Small localStorage helpers for onboarding; every access tolerates storage being unavailable. */
const STEP_TWO_PREFIX = "scooli:onb2:";

export interface StepTwoSelection {
  years: number[];
  subjectIds: string[];
}

export function readStepTwoSelection(userId: string | null | undefined): StepTwoSelection | null {
  if (!userId) return null;
  try {
    const raw = window.localStorage.getItem(STEP_TWO_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StepTwoSelection>;
    if (!Array.isArray(parsed.years) || !Array.isArray(parsed.subjectIds)) return null;
    return { years: parsed.years, subjectIds: parsed.subjectIds };
  } catch {
    return null;
  }
}

export function writeStepTwoSelection(
  userId: string | null | undefined,
  selection: StepTwoSelection,
) {
  if (!userId) return;
  try {
    window.localStorage.setItem(STEP_TWO_PREFIX + userId, JSON.stringify(selection));
  } catch {
    // Best effort.
  }
}

export function clearStepTwoSelection(userId: string | null | undefined) {
  if (!userId) return;
  try {
    window.localStorage.removeItem(STEP_TWO_PREFIX + userId);
  } catch {
    // Best effort.
  }
}
