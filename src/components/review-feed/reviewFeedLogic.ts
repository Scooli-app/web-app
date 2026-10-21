import type { Locale } from "@/i18n/locales";
import type { ReviewItem } from "@/shared/types/review-feed";
import { Routes } from "@/shared/types/routes";
import { toIntlLocale } from "@/shared/utils/calendar";

/** Rows shown before the teacher expands the list. */
export const REVIEW_VISIBLE_ROWS = 3;

/** The rows to render: the first few, or all of them once expanded. */
export function visibleReviewItems(items: ReviewItem[], expanded: boolean): ReviewItem[] {
  return expanded ? items : items.slice(0, REVIEW_VISIBLE_ROWS);
}

/** What a row's button does. `none` when the item has nothing to act on. */
export type ReviewAction =
  | { kind: "openReplan" }
  | { kind: "shiftFallback" }
  | { kind: "dismiss" }
  | { kind: "openDocument"; href: string }
  | { kind: "openLesson"; slotId: string }
  | { kind: "generating" }
  | { kind: "none" };

/** Editor route of each document type. Unknown types fall back to the documents list. */
const DOCUMENT_ROUTES: Record<string, string> = {
  lessonPlan: Routes.LESSON_PLAN,
  worksheet: Routes.WORKSHEET,
  presentation: Routes.PRESENTATION,
  test: Routes.TEST,
  quiz: Routes.QUIZ,
  curriculumPlan: Routes.CURRICULUM_PLAN,
};

/** The editor of a suggested document, opened on its review sheet (`?review=1`). */
export function documentReviewHref(documentType: string | null, documentId: string): string {
  const base = (documentType && DOCUMENT_ROUTES[documentType]) || Routes.DOCUMENTS;
  return `${base}/${documentId}?review=1`;
}

/** The one action a row offers, from its kind and status. */
export function reviewAction(item: ReviewItem): ReviewAction {
  if (item.kind === "replan") {
    if (item.status === "generating") return { kind: "generating" };
    if (item.status === "pending") return { kind: "openReplan" };
    if (item.status === "failed") return { kind: "shiftFallback" };
    return { kind: "dismiss" };
  }
  if (item.kind === "document_suggestion") {
    if (item.status === "generating") return { kind: "generating" };
    return item.documentId
      ? { kind: "openDocument", href: documentReviewHref(item.documentType, item.documentId) }
      : { kind: "none" };
  }
  return item.slotId ? { kind: "openLesson", slotId: item.slotId } : { kind: "none" };
}

/** The lesson date as the rows show it: "qui, 23/10". Null without a valid date. */
export function lessonDateLabel(slotDate: string | null, locale: Locale): string | null {
  if (!slotDate) return null;
  const date = new Date(`${slotDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const weekday = date.toLocaleDateString(toIntlLocale(locale), { weekday: "short" }).replace(/\.$/, "");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${day}/${month}`;
}

/** Items the teacher dismissed in this session are hidden (no-change and failed replans only). */
export function withoutDismissed(items: ReviewItem[], dismissedIds: readonly string[]): ReviewItem[] {
  return items.filter((item) => !(item.kind === "replan" && dismissedIds.includes(item.id)));
}
