import type { BugSeverity, FeedbackStatus, FeedbackType } from "@/shared/types/feedback";
import { apiClient } from "./client";

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
  type?: FeedbackType | "ALL";
  status?: FeedbackStatus | "ALL";
  severity?: BugSeverity | "ALL";
}

export const adminFeedbackService = {
  getFeedbackList: async (filters: FeedbackFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.size) params.append("size", filters.size.toString());
    if (filters.type && filters.type !== "ALL") params.append("type", filters.type);
    if (filters.status && filters.status !== "ALL") params.append("status", filters.status);
    if (filters.severity && filters.severity !== "ALL") params.append("severity", filters.severity);

    const response = await apiClient.get<{ items: AdminFeedbackListItem[]; total: number }>(`/admin/feedback?${params.toString()}`);
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
