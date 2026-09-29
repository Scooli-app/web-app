import {
  buildRegularTeachingItems,
  VOCATIONAL_SCHOOL_YEARS,
} from "@/components/document-creation/teaching-profile-preferences";
import type {
  EducationType,
  TeachingItem,
  TeachingProfile,
  VocationalUnit,
} from "@/shared/types/teaching-profile";

/** Element id of the O Meu Ensino card, so other screens can link straight to it. */
export const TEACHING_PROFILE_ANCHOR = "o-meu-ensino";

/**
 * Which kinds of teaching the settings card shows. Unlike the backend's single
 * `educationType`, the two are independent: plenty of teachers give Português
 * to a 10.º regular class and to a curso profissional in the same year.
 */
export interface TeachingScope {
  regular: boolean;
  vocational: boolean;
}

const ALL_SCHOOL_YEARS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Recovers the scope from a saved profile. `educationType` is only a hint:
 * a profile with courses teaches vocational whatever the flag says, and one
 * with regular subjects (or basic-education years) teaches regular too.
 */
export function deriveTeachingScope(profile: TeachingProfile): TeachingScope {
  const vocational = profile.courses.length > 0 || profile.educationType === "vocational";
  const regular =
    profile.items.some((item) => item.qualificationCode === null) ||
    profile.schoolYears.some((year) => year < VOCATIONAL_SCHOOL_YEARS[0]) ||
    !vocational;
  return { regular, vocational };
}

/** School years a teacher can pick for the given scope. */
export function schoolYearsForScope(scope: TeachingScope): number[] {
  if (scope.regular) return ALL_SCHOOL_YEARS;
  if (scope.vocational) return [...VOCATIONAL_SCHOOL_YEARS];
  return [];
}

/**
 * The profile exactly as the card shows it. Anything hidden — a switched-off
 * scope, years outside it — is dropped rather than silently kept, so what the
 * teacher sees is what gets saved.
 */
export function buildProfileForSave(draft: TeachingProfile, scope: TeachingScope): TeachingProfile {
  const allowedYears = new Set(schoolYearsForScope(scope));
  const courses = scope.vocational ? [...draft.courses] : [];
  const courseSet = new Set(courses);

  const regularItems = scope.regular
    ? buildRegularTeachingItems(
        draft.items
          .filter((item) => item.qualificationCode === null && item.kind === "subject")
          .map((item) => item.code)
      )
    : [];
  const vocationalItems = draft.items.filter(
    (item) => item.qualificationCode !== null && courseSet.has(item.qualificationCode)
  );

  // The backend only reads `educationType` to decide whether to prepare the
  // referentials of saved courses, so any profile with courses is vocational.
  const educationType: EducationType =
    scope.vocational && (courses.length > 0 || !scope.regular) ? "vocational" : "regular";

  return {
    ...draft,
    educationType,
    courses,
    courseStates: draft.courseStates.filter((state) => courseSet.has(state.code)),
    schoolYears: draft.schoolYears
      .filter((year) => allowedYears.has(year))
      .sort((a, b) => a - b),
    items: [...regularItems, ...vocationalItems],
  };
}

/**
 * The unified switcher's three states — mirrors ClassSection's
 * regular/vocational SegmentedControl, plus a third state for teachers who
 * legitimately teach both. Lives here (not in TeachingProfileCard.tsx) so it
 * can be unit-tested without a JSX-capable test transform.
 */
export type ScopeMode = "regular" | "vocational" | "both";

export function scopeToMode(scope: TeachingScope): ScopeMode {
  if (scope.regular && scope.vocational) return "both";
  return scope.vocational ? "vocational" : "regular";
}

export function modeToScope(mode: ScopeMode): TeachingScope {
  return { regular: mode !== "vocational", vocational: mode !== "regular" };
}

/** Order-insensitive identity of the saveable part of a profile, for dirty checks. */
export function profileFingerprint(profile: TeachingProfile): string {
  const itemKey = (item: TeachingItem) =>
    `${item.qualificationCode ?? ""}|${item.kind}|${item.code}`;
  return JSON.stringify({
    educationType: profile.educationType,
    courses: [...profile.courses].sort(),
    schoolYears: [...profile.schoolYears].sort((a, b) => a - b),
    items: profile.items.map(itemKey).sort(),
  });
}

const isUnitOf = (item: TeachingItem, courseCode: string) =>
  item.qualificationCode === courseCode && item.kind === "unit";

function unitItem(courseCode: string, unit: VocationalUnit): TeachingItem {
  return {
    qualificationCode: courseCode,
    kind: "unit",
    code: unit.code,
    label: unit.title,
    trainingComponent: "technological",
  };
}

/** Adds or removes one UC of a course. */
export function toggleUnitItem(
  items: TeachingItem[],
  courseCode: string,
  unit: VocationalUnit
): TeachingItem[] {
  const exists = items.some((item) => isUnitOf(item, courseCode) && item.code === unit.code);
  return exists
    ? items.filter((item) => !(isUnitOf(item, courseCode) && item.code === unit.code))
    : [...items, unitItem(courseCode, unit)];
}

/** Selects or clears a batch of a course's UCs ("Selecionar todas" / "Limpar"). */
export function setUnitItems(
  items: TeachingItem[],
  courseCode: string,
  units: VocationalUnit[],
  selected: boolean
): TeachingItem[] {
  const codes = new Set(units.map((unit) => unit.code));
  const others = items.filter((item) => !(isUnitOf(item, courseCode) && codes.has(item.code)));
  return selected ? [...others, ...units.map((unit) => unitItem(courseCode, unit))] : others;
}

/**
 * Folds the courses and UCs picked during onboarding into whatever profile the
 * teacher already has: those courses' UCs are replaced by the new selection,
 * everything else is kept.
 */
export function mergeVocationalSelection(
  existing: TeachingProfile,
  courses: string[],
  units: TeachingItem[]
): TeachingProfile {
  const picked = new Set(courses);
  const draft: TeachingProfile = {
    ...existing,
    courses: [...existing.courses, ...courses.filter((code) => !existing.courses.includes(code))],
    items: [
      ...existing.items.filter(
        (item) => item.qualificationCode === null || !picked.has(item.qualificationCode)
      ),
      ...units.filter((item) => item.qualificationCode !== null && picked.has(item.qualificationCode)),
    ],
  };
  return buildProfileForSave(draft, { ...deriveTeachingScope(existing), vocational: true });
}
