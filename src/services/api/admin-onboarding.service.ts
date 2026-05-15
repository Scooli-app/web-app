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
  acquisitionSource: string;
  subjectArea?: string | null;
  teachingLevel?: string | null;
  createdAt: string;
}

export interface AdminOnboardingOverview {
  summary: AdminOnboardingSummary;
  acquisitionSourceBreakdown: AdminOnboardingBreakdownItem[];
  subjectAreaBreakdown: AdminOnboardingBreakdownItem[];
  teachingLevelBreakdown: AdminOnboardingBreakdownItem[];
  recentResponses: AdminOnboardingResponse[];
}

export const adminOnboardingService = {
  getOverview: async (): Promise<AdminOnboardingOverview> => {
    const response = await apiClient.get<AdminOnboardingOverview>("/admin/onboarding/overview");
    return response.data;
  },
};
