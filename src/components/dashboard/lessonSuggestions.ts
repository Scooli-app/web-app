import { SUBJECTS } from "@/components/document-creation/constants";
import type { CompanionType } from "@/components/dashboard/weekWindow";
import type { MyWeekLessonDocument } from "@/shared/types/my-week";

/**
 * Practical subjects are learnt by doing (worksheets, quizzes); visual/theoretical ones are better
 * explained with slides. Anything not listed counts as practical.
 */
export type SubjectProfile = "practical" | "visual";

const VISUAL_SUBJECT_IDS: ReadonlySet<string> = new Set([
  "estudo_meio", "ciencias_naturais", "biologia", "bg", "geologia",
  "historia", "historia_a", "historia_b", "hgp", "hca", "hcd",
  "geografia", "geografia_a", "geografia_c",
  "filosofia", "filosofia_a", "psicologia_b", "sociologia", "antropologia", "ciencia_politica", "direito",
  "economia_a", "economia_c", "cidadania", "emrc", "emre",
  "literatura_portuguesa", "classicos_literatura", "literaturas_lp",
  "artes_visuais", "educacao_visual", "desenho_a",
]);

const DISPLAY_ORDER: readonly CompanionType[] = ["lessonPlan", "worksheet", "quiz", "presentation", "test"];

/** What each kind of lesson needs, for each kind of subject (agreed with Miguel, 16 Oct 2026). */
const SUGGESTIONS: Record<string, Record<SubjectProfile, CompanionType[]>> = {
  LESSON: { practical: ["lessonPlan", "worksheet"], visual: ["lessonPlan", "presentation"] },
  EXERCISE: { practical: ["worksheet", "quiz"], visual: ["worksheet", "presentation"] },
  REVIEW: { practical: ["quiz", "worksheet"], visual: ["presentation", "quiz"] },
  ASSESSMENT: { practical: ["test"], visual: ["test"] },
};

/** The subject as stored on the turma (its English value, e.g. "History") or its id. */
export function subjectProfile(subject: string | null | undefined): SubjectProfile {
  if (!subject) return "practical";
  const match = SUBJECTS.find((s) => s.value === subject || s.id === subject);
  return match && VISUAL_SUBJECT_IDS.has(match.id) ? "visual" : "practical";
}

/**
 * The documents the lesson pop-up's main button prepares: what suits this lesson type and
 * subject, minus what the lesson already has (a failed attempt doesn't count) and minus types
 * whose creation is switched off.
 */
export function suggestedDocuments(
  slotType: string,
  subject: string | null | undefined,
  documents: MyWeekLessonDocument[],
  flags: { worksheet: boolean; presentation: boolean },
): CompanionType[] {
  const byProfile = SUGGESTIONS[slotType] ?? (slotType === "HOLIDAY" ? null : SUGGESTIONS.LESSON);
  if (!byProfile) return [];
  const wanted = new Set(byProfile[subjectProfile(subject)]);
  const existing = new Set(documents.filter((d) => d.status !== "failed").map((d) => d.role));
  return DISPLAY_ORDER.filter(
    (type) =>
      wanted.has(type) &&
      !existing.has(type) &&
      !(type === "worksheet" && !flags.worksheet) &&
      !(type === "presentation" && !flags.presentation),
  );
}

function mondayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/**
 * Credits a set of preparations will spend, or null for Pro teachers (no cost to show).
 * Mirrors the server: a free teacher's first lesson plans in their free week cost nothing (the
 * first plan they generate claims that week); every other document costs one credit.
 */
export function preparationCost(
  lessons: { slotDate: string; types: CompanionType[] }[],
  limits: { isPro: boolean; freeWeekStart: string | null } | null,
): number | null {
  if (limits?.isPro) return null;
  const ordered = [...lessons].sort((a, b) => a.slotDate.localeCompare(b.slotDate));
  let freeWeek = limits ? limits.freeWeekStart : null;
  let cost = 0;
  for (const lesson of ordered) {
    for (const type of lesson.types) {
      if (type === "lessonPlan" && limits) {
        const week = mondayOf(lesson.slotDate);
        freeWeek ??= week;
        if (week === freeWeek) continue;
      }
      cost += 1;
    }
  }
  return cost;
}
