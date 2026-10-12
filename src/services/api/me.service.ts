import apiClient from "./client";
import type { MyWeek } from "@/shared/types/my-week";
import type { PlanLimits } from "@/shared/types/plan-limits";

export const meService = {
  getWeek: (weekStart: string) =>
    apiClient
      .get<MyWeek>("/users/me/week", { params: { weekStart } })
      .then((r) => r.data),
  getPlanLimits: () =>
    apiClient.get<PlanLimits>("/users/me/plan-limits").then((r) => r.data),
  getEmailPreferences: () =>
    apiClient
      .get<{ weeklyDigest: boolean }>("/users/me/email-preferences")
      .then((r) => r.data),
  setEmailPreferences: (weeklyDigest: boolean) =>
    apiClient.put("/users/me/email-preferences", { weeklyDigest }),
  setPlanningDay: (planningDay: number | null) =>
    apiClient.put("/users/me", { planningDay }),
};
