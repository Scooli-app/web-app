import type {
  FeedbackSurveyPromptRequest,
  FeedbackSurveyStatusResponse,
  FeedbackSurveySubmitRequest,
} from "@/shared/types/feedbackSurvey";
import apiClient from "./client";

export const feedbackSurveyService = {
  getStatus: async (
    promptKey?: string,
  ): Promise<FeedbackSurveyStatusResponse> => {
    const response = await apiClient.get<FeedbackSurveyStatusResponse>(
      "/feedback-survey/status",
      promptKey ? { params: { promptKey } } : undefined,
    );
    return response.data;
  },

  markViewed: async (
    payload: FeedbackSurveyPromptRequest,
  ): Promise<FeedbackSurveyStatusResponse> => {
    const response = await apiClient.post<FeedbackSurveyStatusResponse>(
      "/feedback-survey/viewed",
      payload,
    );
    return response.data;
  },

  snooze: async (
    payload: FeedbackSurveyPromptRequest,
  ): Promise<FeedbackSurveyStatusResponse> => {
    const response = await apiClient.post<FeedbackSurveyStatusResponse>(
      "/feedback-survey/snooze",
      payload,
    );
    return response.data;
  },

  submit: async (payload: FeedbackSurveySubmitRequest): Promise<void> => {
    await apiClient.post("/feedback-survey/submit", payload);
  },
};
