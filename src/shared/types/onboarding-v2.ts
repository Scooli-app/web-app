import type { TeachingItem } from "./teaching-profile";

export type TeacherRole = "teacher" | "coordinator" | "director" | "tutor" | "other";

export interface OnboardingV2Status {
  mode: "full" | "profile" | "none";
  profileDone: boolean;
  /** The user already has at least one class (created in step 3). */
  hasClass: boolean;
}

export interface OnboardingV2Profile {
  schoolName: string | null;
  noSchool: boolean;
  teacherRole: TeacherRole;
  schoolYears: number[];
  items: TeachingItem[];
}

export interface OnboardingV2Complete {
  planningDay: number;
  weeklyEmail: boolean;
  goals: string[] | null;
  acquisitionSource: string | null;
  acquisitionSourceOther: string | null;
  skippedClass: boolean;
}
