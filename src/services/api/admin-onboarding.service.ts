import apiClient from "./client";

export interface AdminOnboardingBreakdownItem {
  key: string;
  count: number;
}

export interface AdminOnboardingSummary {
  trackedUsers: number;
  responses: number;
  completed: number;
  completionRate: number;
  topAcquisitionSource: string | null;
}

export interface AdminOnboardingResponse {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  userUsername?: string | null;
  version: "v1" | "v2";
  acquisitionSource?: string | null;
  acquisitionSourceOther?: string | null;
  subjectArea?: string | null;
  subjectAreaOther?: string | null;
  teachingLevel?: string | null;
  goals?: string | null;
  schoolName?: string | null;
  noSchool?: boolean | null;
  teacherRole?: string | null;
  planningDay?: number | null;
  prepHoursPerWeek?: string | null;
  currentTools?: string | null;
  classCount?: string | null;
  createdAt: string;
}

export interface AdminOnboardingOverview {
  summary: AdminOnboardingSummary;
  acquisitionSourceBreakdown: AdminOnboardingBreakdownItem[];
  subjectAreaBreakdown: AdminOnboardingBreakdownItem[];
  teachingLevelBreakdown: AdminOnboardingBreakdownItem[];
  goalsBreakdown: AdminOnboardingBreakdownItem[];
  prepHoursBreakdown?: AdminOnboardingBreakdownItem[];
  currentToolsBreakdown?: AdminOnboardingBreakdownItem[];
  classCountBreakdown?: AdminOnboardingBreakdownItem[];
  recentResponses: AdminOnboardingResponse[];
}

export interface AdminSchoolTeacher {
  userId: string;
  name?: string | null;
  email: string;
  teacherRole?: string | null;
  schoolNameAsTyped: string;
  joinedAt?: string | null;
}

export interface AdminSchool {
  name: string;
  teacherCount: number;
  variants: { name: string; count: number }[];
  teachers: AdminSchoolTeacher[];
}

export interface AdminSchoolsOverview {
  teachersWithSchool: number;
  teachersWithoutSchool: number;
  schools: AdminSchool[];
}

export const adminOnboardingService = {
  getOverview: async (): Promise<AdminOnboardingOverview> => {
    const response = await apiClient.get<AdminOnboardingOverview>("/admin/onboarding/overview");
    return response.data;
  },
  getSchools: async (): Promise<AdminSchoolsOverview> => {
    const response = await apiClient.get<AdminSchoolsOverview>("/admin/onboarding/schools");
    return response.data;
  },
};
