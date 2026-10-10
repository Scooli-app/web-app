import apiClient from "./client";
import type {
  OnboardingV2Complete,
  OnboardingV2DraftPatch,
  OnboardingV2Profile,
  OnboardingV2Status,
} from "@/shared/types/onboarding-v2";

export const onboardingV2Service = {
  getStatus: () =>
    apiClient.get<OnboardingV2Status>("/onboarding/v2/status").then((r) => r.data),
  saveProfile: (p: OnboardingV2Profile) => apiClient.post("/onboarding/v2/profile", p),
  saveDraft: (p: OnboardingV2DraftPatch) => apiClient.patch("/onboarding/v2/draft", p),
  /** Page-unload variant: `keepalive` lets the request outlive the page. Best effort. */
  saveDraftKeepalive: (p: OnboardingV2DraftPatch, token: string) =>
    fetch(`${process.env.NEXT_PUBLIC_BASE_API_URL || ""}/onboarding/v2/draft`, {
      method: "PATCH",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(p),
    }).catch(() => undefined),
  complete: (c: OnboardingV2Complete) => apiClient.post("/onboarding/v2/complete", c),
  suggestSchools: (q: string) =>
    apiClient
      .get<{ suggestions: string[] }>("/onboarding/schools", { params: { q } })
      .then((r) => r.data.suggestions),
};
