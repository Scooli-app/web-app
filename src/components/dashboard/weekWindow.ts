import type { MyWeek, MyWeekLessonDocument } from "@/shared/types/my-week";
import { addDaysIso } from "@/shared/utils/week";

/** Documents a lesson can get in one click. Mirrors chalkboard's CompanionTypes. */
export type CompanionType = "lessonPlan" | "worksheet" | "quiz" | "presentation" | "test";

const DISPLAY_ORDER: readonly CompanionType[] = ["lessonPlan", "worksheet", "quiz", "presentation", "test"];
const TEACHING: ReadonlySet<CompanionType> = new Set(["lessonPlan", "worksheet", "quiz", "presentation"]);
const ASSESSMENT: ReadonlySet<CompanionType> = new Set(["lessonPlan", "test", "quiz"]);
const IN_PROGRESS = new Set(["generating", "processing"]);

/** `from` and the days after it, as ISO dates (today + 6 by default). */
export function windowDays(fromIso: string, days = 7): string[] {
  return Array.from({ length: days }, (_, i) => addDaysIso(fromIso, i));
}

/**
 * The day the dashboard shows in detail: today when it has lessons, otherwise the next
 * day in the window that does, otherwise the next lesson after the window.
 */
export function pickFocusDay(todayIso: string, week: MyWeek): { iso: string; isToday: boolean } | null {
  const dates = new Set(week.classes.flatMap((c) => c.lessons.map((l) => l.slotDate)));
  if (dates.has(todayIso)) return { iso: todayIso, isToday: true };
  const next = [...dates].filter((d) => d > todayIso).sort()[0];
  if (next) return { iso: next, isToday: false };
  if (week.nextLessonDate) return { iso: week.nextLessonDate, isToday: false };
  return null;
}

/**
 * What the card's header names: "Hoje" only for today's lessons in the window that starts today,
 * the next lesson day when today has none, otherwise the window itself (after the arrows moved it).
 */
export function weekTitle(
  fromIso: string,
  todayIso: string,
  focus: { iso: string; isToday: boolean } | null,
): { kind: "today" | "focus" | "window"; iso: string } {
  if (fromIso !== todayIso || !focus) return { kind: "window", iso: fromIso };
  return focus.isToday ? { kind: "today", iso: focus.iso } : { kind: "focus", iso: focus.iso };
}

/** The one-click documents a lesson can still get, in display order. */
export function companionTypesFor(
  slotType: string,
  documents: MyWeekLessonDocument[],
  flags: { worksheet: boolean; presentation: boolean },
): CompanionType[] {
  if (slotType === "HOLIDAY") return [];
  const allowed = slotType === "ASSESSMENT" ? ASSESSMENT : TEACHING;
  // A failed document doesn't count: the teacher can create that type again.
  const existing = new Set(documents.filter((d) => d.status !== "failed").map((d) => d.role));
  return DISPLAY_ORDER.filter(
    (type) =>
      allowed.has(type) &&
      !existing.has(type) &&
      !(type === "worksheet" && !flags.worksheet) &&
      !(type === "presentation" && !flags.presentation),
  );
}

/**
 * A lesson's objectives as separate items. They're stored as one string, either one per line or
 * as "- a - b - c"; only a dash with spaces around it separates items, so "dia-a-dia" stays whole.
 */
export function objectiveItems(description: string | null | undefined): string[] {
  if (!description?.trim()) return [];
  return description
    .split(/\n|(?:^|\s)[-•]\s/)
    .map((item) => item.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

/** The lesson's documents worth showing as chips (failed attempts are hidden; "+ Tipo" comes back). */
export function visibleDocuments(documents: MyWeekLessonDocument[]): MyWeekLessonDocument[] {
  return documents.filter((d) => d.status !== "failed");
}

export function isDocumentInProgress(status: string): boolean {
  return IN_PROGRESS.has(status);
}

/** True while any lesson document in the week is still being prepared (the card keeps polling). */
export function hasGeneratingDocument(week: MyWeek): boolean {
  return week.classes.some((c) => c.lessons.some((l) => l.documents.some((d) => isDocumentInProgress(d.status))));
}
