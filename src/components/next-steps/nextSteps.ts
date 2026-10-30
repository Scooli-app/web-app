import { addDaysIso } from "@/shared/utils/week";
import type { Suggestion, SuggestionKind } from "@/shared/types/suggestions";

/** The card shows at most this many steps. */
export const NEXT_STEPS_LIMIT = 3;

/** What the one action button of a step does. */
export type NextStepAction = "prepare" | "reschedule" | "reinforce" | "view";

const ACTION_BY_KIND: Record<SuggestionKind, NextStepAction> = {
  prepare_next: "prepare",
  replan_not_held: "reschedule",
  reinforce: "reinforce",
  check_in: "view",
};

/** The action for a step kind, or null for a kind this build does not know (such a step is not shown). */
export function actionFor(kind: string): NextStepAction | null {
  return Object.prototype.hasOwnProperty.call(ACTION_BY_KIND, kind)
    ? ACTION_BY_KIND[kind as SuggestionKind]
    : null;
}

/** The steps to show: the known kinds only, in the order the backend sent them, at most three. */
/** The dashboard's "Confirma N aulas" counts what the strip still asks (null: no strip); none left drops it. */
export function withStripCount(items: Suggestion[], stripCount: number | null): Suggestion[] {
  if (stripCount === null) return items;
  return items.flatMap((item) =>
    item.kind !== "check_in" ? [item] : stripCount === 0 ? [] : [{ ...item, count: Math.min(item.count ?? stripCount, stripCount) }],
  );
}

export function visibleSteps(items: Suggestion[]): Suggestion[] {
  return items.filter((item) => actionFor(item.kind) !== null).slice(0, NEXT_STEPS_LIMIT);
}

/**
 * Whether the card should fetch at all. With the flag off nothing is requested and nothing is rendered.
 * A step needs its lesson (or, for the dashboard check-in, its count) to be actionable, so a step missing
 * what its action needs is not shown either.
 */
export function shouldLoadNextSteps(enabled: boolean): boolean {
  return enabled;
}

/** The lesson a prepare or reschedule or reinforce step acts on, or null when the step lacks one. */
export function lessonOf(item: Suggestion): { timetableId: string; slotId: string } | null {
  if (!item.timetableId || !item.slotId) return null;
  return { timetableId: item.timetableId, slotId: item.slotId };
}

/** The week (Monday, YYYY-MM-DD) that contains a lesson date, as the lesson pop-up expects it. */
export function weekStartOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const offset = (d.getDay() + 6) % 7;
  return addDaysIso(isoDate, -offset);
}

/** A lesson date as the teacher reads it, e.g. "terça-feira, 20 de outubro" in pt-PT. */
export function formatStepDay(isoDate: string, intlLocale: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(intlLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
