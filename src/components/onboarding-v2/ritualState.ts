import type { AcquisitionSource, OnboardingGoal } from "@/shared/types/onboarding";
import type {
  ClassCount,
  CurrentTool,
  OnboardingV2Complete,
  OnboardingV2DraftAnswers,
  OnboardingV2DraftPatch,
  OnboardingV2Step,
  PrepHoursPerWeek,
} from "@/shared/types/onboarding-v2";

/** Steps 5 (baseline) and 6 (ritual) answers. Owned by the flow hook so they survive the step unmounting. */
export interface RitualState {
  planningDay: number;
  /** null = the teacher never chose; the toggle shows ON but nothing is saved until touched. */
  weeklyEmail: boolean | null;
  goals: OnboardingGoal[];
  source: AcquisitionSource | null;
  sourceOther: string;
  /** Optional baseline questions (step 5). null / [] = not answered. */
  prepHours: PrepHoursPerWeek | null;
  currentTools: CurrentTool[];
  classCount: ClassCount | null;
}

/** Baseline answers as analytics properties; unanswered questions are omitted. */
export function baselineAnalytics(state: RitualState): Record<string, unknown> {
  return {
    ...(state.prepHours ? { prep_hours_per_week: state.prepHours } : {}),
    ...(state.currentTools.length > 0 ? { current_tools: state.currentTools } : {}),
    ...(state.classCount ? { class_count: state.classCount } : {}),
  };
}

/**
 * The complete current state with explicit values: `goals: []` clears, the source is null
 * only when never chosen. Nothing is left to whatever drafts happened to reach the server.
 */
export function buildCompletePayload(
  state: RitualState,
  skippedClass: boolean,
): OnboardingV2Complete {
  const other = state.source === "OTHER" ? state.sourceOther.trim() : "";
  return {
    planningDay: state.planningDay,
    weeklyEmail: effectiveWeeklyEmail(state.weeklyEmail),
    goals: state.goals,
    acquisitionSource: state.source,
    acquisitionSourceOther: other || null,
    skippedClass,
    prepHoursPerWeek: state.prepHours,
    currentTools: state.currentTools,
    classCount: state.classCount,
  };
}

const DEFAULT_PLANNING_DAY = 7;

/** What the toggle shows and what Finish saves: ON unless the teacher turned it off. */
export const effectiveWeeklyEmail = (value: boolean | null): boolean => value ?? true;

export function initialRitualState(draft: OnboardingV2DraftAnswers | null): RitualState {
  return {
    planningDay: draft?.planningDay ?? DEFAULT_PLANNING_DAY,
    weeklyEmail: draft?.weeklyEmail ?? null,
    goals: (draft?.goals ?? []) as OnboardingGoal[],
    source: (draft?.acquisitionSource ?? null) as AcquisitionSource | null,
    sourceOther: draft?.acquisitionSourceOther ?? "",
    prepHours: (draft?.prepHoursPerWeek ?? null) as PrepHoursPerWeek | null,
    currentTools: (draft?.currentTools ?? []) as CurrentTool[],
    classCount: (draft?.classCount ?? null) as ClassCount | null,
  };
}

export function applyRitualPatch(state: RitualState, patch: Partial<RitualState>): RitualState {
  return { ...state, ...patch };
}

/** Autosave payload of the whole steps 5-6 state; `step` is the step being edited. */
export function ritualDraftPatch(
  state: RitualState,
  step: OnboardingV2Step = 6,
): OnboardingV2DraftPatch {
  return {
    step,
    planningDay: state.planningDay,
    ...(state.weeklyEmail !== null ? { weeklyEmail: state.weeklyEmail } : {}),
    goals: state.goals,
    ...(state.source ? { acquisitionSource: state.source } : {}),
    acquisitionSourceOther: state.source === "OTHER" ? state.sourceOther.trim() : "",
    ...(state.prepHours ? { prepHoursPerWeek: state.prepHours } : {}),
    currentTools: state.currentTools,
    ...(state.classCount ? { classCount: state.classCount } : {}),
  };
}
