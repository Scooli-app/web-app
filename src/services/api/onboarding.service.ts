import type {
  OnboardingPromptRequest,
  OnboardingStatusResponse,
  OnboardingSubmitRequest,
} from "@/shared/types/onboarding";
import apiClient from "./client";

export const onboardingService = {
  getStatus: async (): Promise<OnboardingStatusResponse> => {
    const response = await apiClient.get<OnboardingStatusResponse>("/onboarding/status");
    return response.data;
  },

  markViewed: async (promptKey: string): Promise<OnboardingStatusResponse> => {
    const payload: OnboardingPromptRequest = { promptKey };
    const response = await apiClient.post<OnboardingStatusResponse>("/onboarding/viewed", payload);
    return response.data;
  },

  skip: async (promptKey: string): Promise<OnboardingStatusResponse> => {
    const payload: OnboardingPromptRequest = { promptKey };
    const response = await apiClient.post<OnboardingStatusResponse>("/onboarding/skip", payload);
    return response.data;
  },

  submit: async (payload: OnboardingSubmitRequest): Promise<void> => {
    await apiClient.post("/onboarding/submit", {
      ...payload,
      subjectArea: payload.subjectArea?.join(",") ?? null,
      teachingLevel: payload.teachingLevel?.join(",") ?? null,
      acquisitionSourceOther: payload.acquisitionSourceOther ?? null,
      subjectAreaOther: payload.subjectAreaOther ?? null,
    });
  },
};
