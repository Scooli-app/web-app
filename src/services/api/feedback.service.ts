import type { CreateFeedbackParams, Feedback, UploadResponse } from "@/shared/types/feedback";
import apiClient from "./client";

export const feedbackService = {
  /**
   * Create a new feedback (suggestion or bug report)
   */
  createFeedback: async (data: CreateFeedbackParams): Promise<Feedback> => {
    const response = await apiClient.post<Feedback>("/feedback", data);
    return response.data;
  },

  /**
   * Get feedback history for the current user
   */
  getMyFeedback: async (): Promise<Feedback[]> => {
    const response = await apiClient.get<Feedback[]>("/feedback/me");
    return response.data;
  },

  /**
   * Upload a file for feedback attachment
   * @param file The file to upload
   * @param feedbackId The UUID of the feedback (generated on frontend)
   */
  uploadFile: async (file: File, feedbackId: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("feedbackId", feedbackId);

    const response = await apiClient.post<UploadResponse>("/uploads", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
