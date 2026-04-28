import apiClient from "./client";

export type AdminUserActivityBucket = "inactive" | "single_day" | "repeat";

export interface AdminUserInsightsSummary {
  totalUsers: number;
  usersWithTrackedActivity: number;
  usersWithNoTrackedActivity: number;
  usersWithSingleActiveDay: number;
  repeatUsers: number;
  totalDocumentsCreated: number;
  totalDocumentGenerationInteractions: number;
  totalDocumentChatInteractions: number;
  totalAssistantChatInteractions: number;
  totalImageGenerationInteractions: number;
  totalImageRegenerationInteractions: number;
  totalResourcesShared: number;
  clerkEnrichmentEnabled: boolean;
  clerkEnrichmentAvailable: boolean;
  clerkUsersTotal: number;
  clerkUsersWithoutDatabaseRecord: number;
  usersWithClerkSignInButNoTrackedActivity: number;
  clerkError?: string | null;
}

export interface AdminUserInsight {
  userId: string;
  clerkUserId: string;
  email: string;
  name?: string | null;
  username?: string | null;
  activityBucket: AdminUserActivityBucket;
  activeDays: number;
  documentsCreated: number;
  documentGenerationInteractions: number;
  documentChatInteractions: number;
  assistantChatInteractions: number;
  imageGenerationInteractions: number;
  imageRegenerationInteractions: number;
  resourcesShared: number;
  resourceReuseCount: number;
  userCreatedAt?: string | null;
  firstTrackedActivityAt?: string | null;
  lastTrackedActivityAt?: string | null;
  clerkCreatedAt?: string | null;
  clerkLastSignInAt?: string | null;
  clerkLastActiveAt?: string | null;
}

export interface AdminUserInsightsResponse {
  summary: AdminUserInsightsSummary;
  users: AdminUserInsight[];
}

export const adminUserInsightsService = {
  getUserInsights: async (includeClerk = true) => {
    const response = await apiClient.get<AdminUserInsightsResponse>(
      `/admin/user-insights?includeClerk=${includeClerk}`,
    );
    return response.data;
  },
};
