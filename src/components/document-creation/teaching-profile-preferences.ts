import type {
  EducationType,
  TeachingItem,
  TeachingProfile,
} from "@/shared/types/teaching-profile";
import { SUBJECTS } from "./constants";

const subjectsById = new Map(SUBJECTS.map((subject) => [subject.id, subject]));

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

/** Cursos profissionais run from the 10.º to the 12.º ano only. */
export const VOCATIONAL_SCHOOL_YEARS = [10, 11, 12] as const;

/**
 * The year a curso profissional document defaults to: the teacher's lowest
 * saved secondary year, else the course's first year (10.º).
 */
export function getDefaultVocationalSchoolYear(preferredSchoolYears: number[]): number {
  const secondary = preferredSchoolYears.filter((year) =>
    (VOCATIONAL_SCHOOL_YEARS as readonly number[]).includes(year)
  );
  return secondary.length > 0 ? Math.min(...secondary) : VOCATIONAL_SCHOOL_YEARS[0];
}

export interface VocationalCourseOption {
  code: string;
  title: string;
  /** Competence units (UC) the teacher said they will teach in this course. */
  units: { code: string; label: string }[];
}

/**
 * Courses saved on the profile with the UCs the teacher picked in each. A
 * course with no UC picked is still listed — the teacher teaches there, and
 * the creation form falls back to the course's full catalogue.
 */
export function getVocationalCourseOptions(
  profile: TeachingProfile | null
): VocationalCourseOption[] {
  if (!profile) return [];
  const titleByCode = new Map(profile.courseStates.map((state) => [state.code, state.title]));

  return profile.courses.map((code) => ({
    code,
    title: titleByCode.get(code) ?? code,
    units: profile.items
      .filter((item) => item.qualificationCode === code && item.kind === "unit" && item.label.trim())
      .map((item) => ({ code: item.code, label: item.label.trim() })),
  }));
}

/**
 * Which side of the creation form to open on. A teacher whose profile is only
 * cursos profissionais starts there; anyone with regular subjects or
 * basic-education years starts on ensino regular, as before.
 */
export function getDefaultTeachingMode(profile: TeachingProfile | null): EducationType {
  if (!profile || profile.courses.length === 0) return "regular";
  const teachesRegular =
    profile.items.some((item) => item.qualificationCode === null) ||
    profile.schoolYears.some((year) => year < VOCATIONAL_SCHOOL_YEARS[0]);
  return teachesRegular ? "regular" : "vocational";
}
