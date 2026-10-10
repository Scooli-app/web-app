import type { TeachingItem } from "./teaching-profile";

export type TeacherRole = "teacher" | "coordinator" | "director" | "tutor" | "other";

export interface OnboardingV2Status {
  mode: "full" | "profile" | "none";
  profileDone: boolean;
  /** The user already has at least one class (created in step 3). */
  hasClass: boolean;
  /** Last step the server saw in a draft save (null if none). */
  lastStep?: number | null;
  /** Partial answers saved while the teacher was still going through the flow. */
  draft?: OnboardingV2DraftAnswers | null;
}

export interface OnboardingV2DraftAnswers {
  schoolName: string | null;
  noSchool: boolean | null;
  teacherRole: TeacherRole | null;
  planningDay: number | null;
  weeklyEmail: boolean | null;
  goals: string[] | null;
  acquisitionSource: string | null;
  acquisitionSourceOther: string | null;
}

/** Lenient partial save; `step` is the last step the teacher reached. */
export interface OnboardingV2DraftPatch {
  step: 1 | 2 | 3 | 4 | 5;
  schoolName?: string | null;
  noSchool?: boolean;
  teacherRole?: TeacherRole;
  planningDay?: number;
  weeklyEmail?: boolean;
  goals?: string[];
  acquisitionSource?: string;
  acquisitionSourceOther?: string;
  skippedClass?: boolean;
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
