import type { TeachingItem } from "./teaching-profile";

export type TeacherRole = "teacher" | "coordinator" | "director" | "tutor" | "other";

/** Optional baseline answers (single choice, except the tools which are multi-select). */
export type PrepHoursPerWeek = "LT2" | "H2_5" | "H5_10" | "GT10";
export type CurrentTool = "AI_CHAT" | "OTHER_AI" | "WEB_SEARCH" | "PUBLISHER" | "COLLEAGUES" | "FROM_SCRATCH";
export type ClassCount = "C1_2" | "C3_4" | "C5_PLUS";

export type OnboardingV2Step = 1 | 2 | 3 | 4 | 5 | 6;

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
  prepHoursPerWeek?: string | null;
  currentTools?: string[] | null;
  classCount?: string | null;
}

/** Lenient partial save; `step` is the last step the teacher reached. */
export interface OnboardingV2DraftPatch {
  step: OnboardingV2Step;
  schoolName?: string | null;
  noSchool?: boolean;
  teacherRole?: TeacherRole;
  planningDay?: number;
  weeklyEmail?: boolean;
  goals?: string[];
  acquisitionSource?: string;
  acquisitionSourceOther?: string;
  skippedClass?: boolean;
  prepHoursPerWeek?: PrepHoursPerWeek;
  /** [] clears the saved tools. */
  currentTools?: CurrentTool[];
  classCount?: ClassCount;
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
  /** Always the current list: [] clears the saved goals. */
  goals: string[];
  /** null only when the teacher never chose one. */
  acquisitionSource: string | null;
  acquisitionSourceOther: string | null;
  skippedClass: boolean;
  /** null = never answered (the server keeps whatever it has). */
  prepHoursPerWeek: PrepHoursPerWeek | null;
  /** Always the current list: [] clears the saved tools. */
  currentTools: CurrentTool[];
  classCount: ClassCount | null;
}
