/**
 * Turma progress (ENG-204): coverage, lessons, behind-schedule topics and flagged outcomes.
 * Gated by the `class_state_enabled` flag on the backend (403 when off); 404 for another user's turma.
 */

import type { TurmaProgress } from "@/shared/types/progress";
import apiClient from "./client";

export async function getTurmaProgress(timetableId: string): Promise<TurmaProgress> {
  const response = await apiClient.get<TurmaProgress>(
    `/timetable/${encodeURIComponent(timetableId)}/progress`,
  );
  return response.data;
}
