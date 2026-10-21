/**
 * Review feed service: "Por rever", what the AI proposed for a turma and waits for the teacher (ENG-257).
 * Gated by `class_state_enabled` on the backend (403 when off); another user's turma reads as 404.
 */

import type { ReviewItemsResponse, TurmaReviewCount } from "@/shared/types/review-feed";
import apiClient from "./client";

export const reviewFeedService = {
  /** The turma's items, replans first. */
  list: (timetableId: string) =>
    apiClient
      .get<ReviewItemsResponse>(`/timetable/${encodeURIComponent(timetableId)}/review-items`)
      .then((r) => r.data),

  /** The turmas with something waiting, for the dashboard. */
  summary: () => apiClient.get<TurmaReviewCount[]>("/review-items/summary").then((r) => r.data),
};
