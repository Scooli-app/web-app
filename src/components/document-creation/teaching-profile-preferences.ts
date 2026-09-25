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

/**
 * The school year to default the creation form to, when the teacher has
 * saved one or more taught years and hasn't picked one yet. Lowest year
 * first, since that best matches "ano de escolaridade" ordering.
 */
export function getDefaultSchoolYear(preferredSchoolYears: number[]): number | null {
  if (preferredSchoolYears.length === 0) return null;
  return Math.min(...preferredSchoolYears);
}

export interface VocationalCourseOption {
  code: string;
  title: string;
  units: { code: string; label: string }[];
}

/**
 * Resolves a UC's code from the label picked in the unit `<Select>`. The
 * picker's `SelectItem` values are labels (kept as-is for display/back-compat
 * with `subject`), so this is how the create-document flow recovers the code
 * the backend needs for deterministic UC content lookup.
 */
export function findVocationalUnitCode(
  units: { code: string; label: string }[],
  unitLabel: string
): string | undefined {
  return units.find((unit) => unit.label === unitLabel)?.code;
}

/**
 * Resolves a school subject's code from the label picked in the
 * sociocultural/científica `<Select>` — mirrors `findVocationalUnitCode`
 * exactly, just against the school-subjects list instead of units. Used to
 * tell whether a selected label belongs to the school-subject list (vs. a
 * competence unit) in the merged vocational picker, since both share one
 * `<Select>` keyed by display label.
 */
export function findVocationalSchoolSubjectCode(
  subjects: { subjectCode: string; subjectName: string }[],
  subjectLabel: string
): string | undefined {
  return subjects.find((subject) => subject.subjectName === subjectLabel)?.subjectCode;
}

/**
 * Vocational courses/UCs saved on the profile, scoped to currently selected
 * courses — mirrors the "select ensino profissional" creation-form flow.
 */
export function getVocationalCourseOptions(
  profile: TeachingProfile | null
): VocationalCourseOption[] {
  if (!profile) return [];
  const titleByCode = new Map(profile.courseStates.map((state) => [state.code, state.title]));

  return profile.courses.flatMap((code) => {
    const units = profile.items
      .filter((item) => item.qualificationCode === code && item.label.trim())
      .map((item) => ({ code: item.code, label: item.label.trim() }));
    if (units.length === 0) return [];
    return [{ code, title: titleByCode.get(code) ?? code, units }];
  });
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
