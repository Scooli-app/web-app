import type { AcquisitionSource, OnboardingGoal } from "@/shared/types/onboarding";
import type {
  OnboardingV2Complete,
  OnboardingV2DraftAnswers,
  OnboardingV2DraftPatch,
} from "@/shared/types/onboarding-v2";

/** Step-5 answers. Owned by the flow hook so they survive the step unmounting. */
export interface RitualState {
  planningDay: number;
  weeklyEmail: boolean;
  goals: OnboardingGoal[];
  source: AcquisitionSource | null;
  sourceOther: string;
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
    weeklyEmail: state.weeklyEmail,
    goals: state.goals,
    acquisitionSource: state.source,
    acquisitionSourceOther: other || null,
    skippedClass,
  };
}

const DEFAULT_PLANNING_DAY = 7;

export function initialRitualState(draft: OnboardingV2DraftAnswers | null): RitualState {
  return {
    planningDay: draft?.planningDay ?? DEFAULT_PLANNING_DAY,
    weeklyEmail: draft?.weeklyEmail ?? true,
    goals: (draft?.goals ?? []) as OnboardingGoal[],
    source: (draft?.acquisitionSource ?? null) as AcquisitionSource | null,
    sourceOther: draft?.acquisitionSourceOther ?? "",
  };
}

export function applyRitualPatch(state: RitualState, patch: Partial<RitualState>): RitualState {
  return { ...state, ...patch };
}

/** Autosave payload of the whole step-5 state. */
export function ritualDraftPatch(state: RitualState): OnboardingV2DraftPatch {
  return {
    step: 5,
    planningDay: state.planningDay,
    weeklyEmail: state.weeklyEmail,
    goals: state.goals,
    ...(state.source ? { acquisitionSource: state.source } : {}),
    acquisitionSourceOther: state.source === "OTHER" ? state.sourceOther.trim() : "",
  };
}
