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
  if (profile?.educationType !== "regular") return [];

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

export function getTeachingProfileSuggestions(
  profile: TeachingProfile | null
): TeachingProfileSuggestion[] {
  if (!profile) return [];

  const suggestions = profile.educationType === "regular"
    ? profile.items.flatMap((item) => {
        if (item.kind !== "subject" || item.qualificationCode !== null) return [];
        const subject = subjectsById.get(item.code);
        return subject
          ? [{
              key: `regular:${subject.id}`,
              label: subject.value,
              regularSubjectId: subject.id,
            }]
          : [];
      })
    : profile.items.flatMap((item) => {
        if (item.qualificationCode === null || !item.label.trim()) return [];
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
