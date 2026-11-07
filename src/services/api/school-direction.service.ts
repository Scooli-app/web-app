/**
 * School direction views. Admin-only, read-only; 403 `feature_not_available` when `class_state_enabled` is off
 * (see `DirectionGate`), 404 when there is no active organization.
 */

import type {
  DirectionAssessmentWeek,
  DirectionHandover,
  DirectionLearning,
  DirectionOverview,
  DirectionTurmaDetail,
} from "@/shared/types/school-direction";
import apiClient from "./client";

const BASE = "/organizations/current/direction";

export async function getDirectionOverview(): Promise<DirectionOverview> {
  const response = await apiClient.get<DirectionOverview>(`${BASE}/overview`);
  return response.data;
}

export async function getDirectionTurma(id: string): Promise<DirectionTurmaDetail> {
  const response = await apiClient.get<DirectionTurmaDetail>(`${BASE}/turmas/${encodeURIComponent(id)}`);
  return response.data;
}

export async function getDirectionLearning(): Promise<DirectionLearning> {
  const response = await apiClient.get<DirectionLearning>(`${BASE}/learning`);
  return response.data;
}

/** `weekStart` (YYYY-MM-DD) is left out when empty: a blank `weekStart=` is a 400, a missing one means the current week. */
export async function getDirectionAssessments(weekStart?: string): Promise<DirectionAssessmentWeek> {
  const response = await apiClient.get<DirectionAssessmentWeek>(`${BASE}/assessments`, {
    params: weekStart ? { weekStart } : undefined,
  });
  return response.data;
}

export async function getDirectionHandover(teacherId: string, date: string): Promise<DirectionHandover> {
  const response = await apiClient.get<DirectionHandover>(`${BASE}/handover`, {
    params: { teacherId, date },
  });
  return response.data;
}
