import apiClient from "./client";
import type { MyWeek } from "@/shared/types/my-week";
import { parsePlanLimits, type PlanLimits } from "@/shared/types/plan-limits";

export const meService = {
  getWeek: (weekStart: string) =>
    apiClient
      .get<MyWeek>("/users/me/week", { params: { weekStart } })
      .then((r) => r.data),
  /** Today-first rolling window: `from` and the `days` after it (7 = today + 6). */
  getWindow: (from: string, days = 7) =>
    apiClient
      .get<MyWeek>("/users/me/week", { params: { from, days } })
      .then((r) => r.data),
  getPlanLimits: () =>
    apiClient.get<PlanLimits>("/users/me/plan-limits").then((r) => parsePlanLimits(r.data)),
  /**
   * Starts the 30-day Pro trial: with the campaign email's token, or from an in-app button without
   * one. Idempotent on the server (an active trial is returned, not restarted). Resolves to the
   * account's plan limits; a 403 rejects with an ApiRequestError whose `code` is a
   * TrialActivationErrorCode. Callers refresh the plan-limits cache with the result.
   */
  activateTrial: (token?: string) =>
    apiClient
      .post<PlanLimits>("/users/me/trial/activate", token ? { token } : {})
      .then((r) => parsePlanLimits(r.data)),
  getEmailPreferences: () =>
    apiClient
      .get<{ weeklyDigest: boolean }>("/users/me/email-preferences")
      .then((r) => r.data),
  setEmailPreferences: (weeklyDigest: boolean) =>
    apiClient.put("/users/me/email-preferences", { weeklyDigest }),
  setPlanningDay: (planningDay: number | null) =>
    apiClient.put("/users/me", { planningDay }),
};
