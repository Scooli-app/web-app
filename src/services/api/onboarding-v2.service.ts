import apiClient from "./client";
import type {
  OnboardingV2Complete,
  OnboardingV2Profile,
  OnboardingV2Status,
} from "@/shared/types/onboarding-v2";

export const onboardingV2Service = {
  getStatus: () =>
    apiClient.get<OnboardingV2Status>("/onboarding/v2/status").then((r) => r.data),
  saveProfile: (p: OnboardingV2Profile) => apiClient.post("/onboarding/v2/profile", p),
  complete: (c: OnboardingV2Complete) => apiClient.post("/onboarding/v2/complete", c),
  suggestSchools: (q: string) =>
    apiClient
      .get<{ suggestions: string[] }>("/onboarding/schools", { params: { q } })
      .then((r) => r.data.suggestions),
};
