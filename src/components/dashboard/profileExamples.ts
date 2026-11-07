import { SUBJECTS_BY_GRADE } from "@/components/document-creation/constants";
import { suggestedTaughtCount } from "@/components/onboarding-v2/schoolCalendar";
import type { TeachingProfile } from "@/shared/types/teaching-profile";

const MAX_EXAMPLES = 3;

/**
 * Up to three (subject, year) pairs from what the teacher said they teach, for the dashboard's example requests:
 * one per subject first (each in its lowest year that offers it), then the next years, so a teacher with three
 * subjects sees all three.
 */
export function profileExamplePairs(
  profile: TeachingProfile | null,
): { subjectId: string; year: number }[] {
  if (!profile) return [];
  const years = [...profile.schoolYears].sort((a, b) => a - b);
  const yearsBySubject = profile.items
    .filter((item) => item.kind === "subject" && item.qualificationCode === null)
    .map((item) => ({
      subjectId: item.code,
      years: years.filter((year) => (SUBJECTS_BY_GRADE[String(year)] ?? []).includes(item.code)),
    }));
  const pairs: { subjectId: string; year: number }[] = [];
  for (let round = 0; pairs.length < MAX_EXAMPLES; round++) {
    const next = yearsBySubject.filter((s) => round < s.years.length);
    if (next.length === 0) break;
    for (const s of next) {
      if (pairs.length < MAX_EXAMPLES) pairs.push({ subjectId: s.subjectId, year: s.years[round] });
    }
  }
  return pairs;
}

/** The topic that usually comes next at this point of the school year (the one after those usually taught). */
export function currentTopic(topics: string[], today: Date): string | null {
  if (topics.length === 0) return null;
  return topics[Math.min(suggestedTaughtCount(topics.length, today), topics.length - 1)];
}
