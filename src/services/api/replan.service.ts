/**
 * Replan Service: the replanning agent's proposal for a turma's following lessons (ENG-257).
 * Pro-only on the backend: a non-Pro teacher gets 403 `pro_required` (an `ApiRequestError` with that code).
 */

import type { ReplanDecision, ReplanProposal, ReplanStarted } from "@/shared/types/replan";
import apiClient from "./client";

const base = (timetableId: string) => `/timetable/${encodeURIComponent(timetableId)}/replan`;

export const replanService = {
  /** Starts a proposal. `triggerSlotId` is the lesson that was not held or that the teacher picked. */
  start: (timetableId: string, body: { triggerSlotId?: string; note?: string } = {}) =>
    apiClient.post<ReplanStarted>(base(timetableId), body).then((r) => r.data),

  /** The latest proposal, or null when there is none (204). */
  current: (timetableId: string) =>
    apiClient
      .get<ReplanProposal | "">(`${base(timetableId)}/current`, { validateStatus: (s) => s === 200 || s === 204 })
      .then((r) => (r.status === 204 || r.data === "" ? null : r.data)),

  /** `slotIds` null accepts every change; otherwise only the listed lessons are applied. */
  accept: (timetableId: string, proposalId: string, slotIds: string[] | null) =>
    apiClient
      .post<ReplanDecision>(`${base(timetableId)}/${encodeURIComponent(proposalId)}/accept`, { slotIds })
      .then((r) => r.data),

  reject: (timetableId: string, proposalId: string) =>
    apiClient
      .post<ReplanDecision>(`${base(timetableId)}/${encodeURIComponent(proposalId)}/reject`)
      .then((r) => r.data),
};
