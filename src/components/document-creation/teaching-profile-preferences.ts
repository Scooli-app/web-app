import type { TeachingItem, TeachingProfile } from "@/shared/types/teaching-profile";
import { SUBJECTS } from "./constants";

const subjectsById = new Map(SUBJECTS.map((subject) => [subject.id, subject]));

export interface TeachingProfileSuggestion {
  key: string;
  label: string;
  regularSubjectId?: string;
}

export function buildRegularTeachingItems(subjectIds: string[]): TeachingItem[] {
  const seen = new Set<string>();

  return subjectIds.flatMap((id) => {
    const subject = subjectsById.get(id);
    if (!subject || seen.has(id)) return [];
    seen.add(id);

    return [{
      qualificationCode: null,
      kind: "subject" as const,
      code: subject.id,
      label: subject.value,
      trainingComponent: null,
    }];
  });
}

export function getPreferredRegularSubjectIds(
  profile: TeachingProfile | null,
  availableSubjectIds: string[]
): string[] {
  if (!profile) return [];

  const available = new Set(availableSubjectIds);
  const preferred = new Set(
    profile.items
      .filter(
        (item) =>
          item.kind === "subject" &&
          item.qualificationCode === null &&
          subjectsById.has(item.code)
      )
      .map((item) => item.code)
  );

  return availableSubjectIds.filter((id) => preferred.has(id) && available.has(id));
}

export function getPreferredSchoolYears(
  profile: TeachingProfile | null,
  availableYears: number[]
): number[] {
  if (!profile) return [];
  const selected = new Set(
    profile.schoolYears.filter((year) => Number.isInteger(year) && year >= 1 && year <= 12)
  );
  return availableYears.filter((year) => selected.has(year));
}

export function getTeachingProfileSuggestions(
  profile: TeachingProfile | null
): TeachingProfileSuggestion[] {
  if (!profile) return [];
  const selectedCourses = new Set(profile.courses);

  const suggestions = profile.items.flatMap((item) => {
    if (item.kind === "subject" && item.qualificationCode === null) {
      const subject = subjectsById.get(item.code);
      return subject
        ? [{
            key: `regular:${subject.id}`,
            label: subject.value,
            regularSubjectId: subject.id,
          }]
        : [];
    }
    if (item.qualificationCode === null || !selectedCourses.has(item.qualificationCode) || !item.label.trim()) return [];
    return [{
      key: `${item.qualificationCode}:${item.kind}:${item.code}`,
      label: item.label.trim(),
    }];
  });

  return suggestions.filter(
    (suggestion, index) =>
      suggestions.findIndex((candidate) => candidate.label === suggestion.label) === index
  );
}
