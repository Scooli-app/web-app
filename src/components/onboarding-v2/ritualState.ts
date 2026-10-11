import type { AcquisitionSource, OnboardingGoal } from "@/shared/types/onboarding";
import type { OnboardingV2Complete } from "@/shared/types/onboarding-v2";

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
