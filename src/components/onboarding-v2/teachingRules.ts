import type { TeacherRole } from "@/shared/types/onboarding-v2";

/** Step-1 role chips, teaching roles first. */
export const ROLE_ORDER: TeacherRole[] = [
  "teacher",
  "special_ed",
  "vocational",
  "preschool",
  "coordinator",
  "director",
  "tutor",
  "other",
];

/**
 * Step 2 can continue: the same rules as the server's saveProfile. Pre-school needs nothing (no curriculum yet),
 * special education needs years but not subjects, vocational needs years and at least one course (UCs are optional).
 */
export function isTeachingValid(input: {
  role: TeacherRole | null;
  years: number[];
  subjectIds: string[];
  courseCount: number;
}): boolean {
  const { role, years, subjectIds, courseCount } = input;
  if (role === null) return false;
  if (role === "preschool") return true;
  if (years.length === 0) return false;
  if (role === "vocational") return courseCount > 0;
  if (role === "special_ed") return true;
  return subjectIds.length > 0;
}

/** Pre-school has no curriculum in Scooli yet, so there's no class to plan. */
export const skipsClassStep = (role: TeacherRole | null): boolean => role === "preschool";

/** Only 1.º–4.º chosen: the "Sou titular de turma" shortcut applies. */
export const isFirstCycleOnly = (years: number[]): boolean =>
  years.length > 0 && years.every((year) => year <= 4);
