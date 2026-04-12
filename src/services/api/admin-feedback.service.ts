import type { BugSeverity, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import apiClient from "./client";

export interface AdminFeedbackListItem {
  id: string;
  type: FeedbackType;
  title: string;
  userEmail: string;
  status: FeedbackStatus;
  severity: BugSeverity;
  category: string;
  createdAt: string;
}

export interface AdminFeedbackDetail extends AdminFeedbackListItem {
  description: string;
  reproductionSteps?: string;
  bugType?: string;
  userId: string;
  updatedAt: string;
  attachments: { id: string; fileName: string; fileType: string; signedUrl: string }[];
  internalNotes: { id: string; adminId: string; content: string; createdAt: string }[];
  responses: { id: string; adminId: string; content: string; createdAt: string }[];
}

export interface AdminFeedbackMetrics {
  total: number;
  critical: number;
  suggestion: number;
  bug: number;
}

export interface FeedbackFilters {
  page?: number;
  size?: number;
  type?: FeedbackType[];
  status?: FeedbackStatus[];
  severity?: BugSeverity[];
}

const appendMultiValueParam = (
  params: URLSearchParams,
  key: string,
  values?: string[],
) => {
  if (!values?.length) {
    return;
  }

  values.forEach((value) => params.append(key, value));
};

export const adminFeedbackService = {
  getFeedbackList: async (filters: FeedbackFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page !== undefined) params.append("page", filters.page.toString());
    if (filters.size !== undefined) params.append("size", filters.size.toString());
    appendMultiValueParam(params, "type", filters.type);
    appendMultiValueParam(params, "status", filters.status);
    appendMultiValueParam(params, "severity", filters.severity);

    const query = params.toString();
    const endpoint = query ? `/admin/feedback?${query}` : "/admin/feedback";

    const response = await apiClient.get<{ items: AdminFeedbackListItem[]; total: number }>(endpoint);
    return response.data;
  },

  getFeedbackDetail: async (id: string) => {
    const response = await apiClient.get<AdminFeedbackDetail>(`/admin/feedback/${id}`);
    return response.data;
  },

  getMetrics: async () => {
    const response = await apiClient.get<AdminFeedbackMetrics>("/admin/feedback/metrics");
    return response.data;
  },

  updateStatus: async (id: string, status: FeedbackStatus, severity: BugSeverity) => {
    await apiClient.patch(`/admin/feedback/${id}`, { status, severity });
  },

  addNote: async (id: string, content: string) => {
    await apiClient.post(`/admin/feedback/${id}/notes`, { content });
  },

  sendResponse: async (id: string, content: string) => {
    await apiClient.post(`/admin/feedback/${id}/respond`, { content });
  },
};
