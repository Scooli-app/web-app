import apiClient from "./client";

export interface AdminFeedbackSurveyBreakdownItem {
  key: string;
  count: number;
}

export interface AdminFeedbackSurveySummary {
  trackedUsers: number;
  responses: number;
  pending: number;
  snoozed: number;
  completed: number;
  totalShownCount: number;
  totalSnoozeCount: number;
  completionRate: number;
  positiveRate: number;
}

export interface AdminFeedbackSurveyResponse {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  userUsername?: string | null;
  sentiment: string;
  selectedTags: string[];
  comment?: string | null;
  createdAt: string;
}

export interface AdminFeedbackSurveyOverview {
  summary: AdminFeedbackSurveySummary;
  promptStatusBreakdown: AdminFeedbackSurveyBreakdownItem[];
  sentimentBreakdown: AdminFeedbackSurveyBreakdownItem[];
  tagBreakdown: AdminFeedbackSurveyBreakdownItem[];
  recentResponses: AdminFeedbackSurveyResponse[];
}

export const adminFeedbackSurveyService = {
  getOverview: async (
    promptKey?: string,
  ): Promise<AdminFeedbackSurveyOverview> => {
    const response = await apiClient.get<AdminFeedbackSurveyOverview>(
      "/admin/feedback-surveys",
      promptKey ? { params: { promptKey } } : undefined,
    );
    return response.data;
  },
};
