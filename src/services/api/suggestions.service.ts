/**
 * "O que fazer a seguir" (ENG-208): next steps across the user's turmas, or for one turma.
 * Gated by the `class_state_enabled` flag on the backend (403 when off); 404 for another user's turma.
 */

import type { Suggestion } from "@/shared/types/suggestions";
import apiClient from "./client";

/** The most urgent steps across all turmas, at most `limit` (1 to 20 on the backend). */
export async function getSuggestions(limit = 3): Promise<Suggestion[]> {
  const response = await apiClient.get<Suggestion[]>("/suggestions", { params: { limit } });
  return response.data;
}

/** The steps for one turma, most urgent first. */
export async function getTurmaSuggestions(timetableId: string): Promise<Suggestion[]> {
  const response = await apiClient.get<Suggestion[]>(
    `/timetable/${encodeURIComponent(timetableId)}/suggestions`,
  );
  return response.data;
}
