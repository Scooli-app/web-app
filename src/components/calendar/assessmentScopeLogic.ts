import { getAssessmentScope, type AssessmentScope } from "@/services/api/timetable.service";

/**
 * Loads "Vai avaliar" only when class_state_enabled is on, so with the flag off no request goes out.
 * A failed load (not the teacher's slot, not an assessment, network) is "no scope to show": the test is still
 * generated, from the whole AE context, as it was before.
 */
export async function loadAssessmentScope(
  enabled: boolean,
  timetableId: string,
  lessonId: string,
  load: (timetableId: string, lessonId: string) => Promise<AssessmentScope> = getAssessmentScope,
): Promise<AssessmentScope | null> {
  if (!enabled) return null;
  try {
    return await load(timetableId, lessonId);
  } catch {
    return null;
  }
}

/**
 * The outcomes that start ticked: the confirmed and the partly confirmed ones, as the test assesses what was taught. An
 * outcome only an unanswered lesson taught (evidence "assumed", ENG-239) starts unticked, for the teacher to tick.
 */
export function initialSelection(scope: AssessmentScope | null): string[] {
  return scope ? scope.outcomes.filter((outcome) => outcome.evidence !== "assumed").map((outcome) => outcome.id) : [];
}

/** Ticks or unticks one outcome, keeping the scope's order. */
export function toggleOutcome(selected: readonly string[], id: string, scope: AssessmentScope | null): string[] {
  const order = scope ? scope.outcomes.map((outcome) => outcome.id) : [];
  const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
  return order.filter((outcomeId) => next.includes(outcomeId));
}

/**
 * The `outcomeIds` a test request sends. Undefined when there is no scope to choose from (the backend then uses the
 * whole scope); otherwise the ticked outcomes.
 */
export function testRequestOutcomeIds(
  scope: AssessmentScope | null,
  selected: readonly string[],
): string[] | undefined {
  if (!scope || scope.outcomes.length === 0) return undefined;
  return [...selected];
}

/**
 * A test cannot be asked for with nothing ticked: the scope has outcomes, and none of them is selected. The test chip
 * is hidden then, with a hint to tick at least one.
 */
export function testBlocked(scope: AssessmentScope | null, selected: readonly string[]): boolean {
  return !!scope && scope.outcomes.length > 0 && selected.length === 0;
}
