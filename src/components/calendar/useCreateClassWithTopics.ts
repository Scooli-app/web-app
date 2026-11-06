"use client";

import type { CreateTimetableParams } from "@/services/api/timetable.service";
import { useAppDispatch } from "@/store/hooks";
import { createTimetable, generateTopics } from "@/store/timetable/timetableSlice";
import { useCallback, useEffect, useState } from "react";
import { invalidatePlanLimits } from "@/hooks/usePlanLimits";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { isUpgradeLimitFailure } from "@/services/api/client";

export type ClassCreationPhase = "idle" | "creating" | "topics" | "done" | "failed";

export type CreateClassResult =
  | { ok: true; timetableId: string; topicsReady: boolean }
  | { ok: false; error?: string };

/**
 * Creates a turma and waits for its lesson topics before handing back — shared
 * by the calendar/novo wizard and the one-click "Criar turma" on a planificação.
 *
 * Navigating straight to the calendar while topics were still being generated in
 * the background left teachers looking at a week of empty, untitled lessons that
 * only filled in after a few refreshes. Waiting here — behind a progress screen —
 * means the calendar is complete the first time it opens. A failed generation is
 * surfaced (`failed`) with a retry, instead of an empty calendar.
 */
export function useCreateClassWithTopics() {
  const dispatch = useAppDispatch();
  const { guard } = useAccountAccess();
  const [phase, setPhase] = useState<ClassCreationPhase>("idle");
  const [timetableId, setTimetableId] = useState<string | null>(null);

  // Leaving mid-way would leave the turma without topics — ask first.
  const busy = phase === "creating" || phase === "topics";
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  const generate = useCallback(
    async (id: string) => {
      // Read-only account (ENG-321): the turma is created (allowed), its AI topics are not.
      // The paywall opens and the teacher carries on to the turma instead of a failure screen.
      if (!guard("generate")) {
        setPhase("done");
        return true;
      }
      setPhase("topics");
      const result = await dispatch(generateTopics(id));
      if (generateTopics.rejected.match(result) && isUpgradeLimitFailure(result.error)) {
        // The lock (or a plan limit) started mid-session: the API client opened the paywall.
        setPhase("done");
        return true;
      }
      // 0 titles written means the model's answer was unusable — as good as a failure.
      const ready = generateTopics.fulfilled.match(result) && result.payload.updated > 0;
      setPhase(ready ? "done" : "failed");
      return ready;
    },
    [dispatch, guard]
  );

  const create = useCallback(
    async (params: CreateTimetableParams): Promise<CreateClassResult> => {
      setPhase("creating");
      const result = await dispatch(createTimetable(params));
      if (!createTimetable.fulfilled.match(result)) {
        setPhase("idle");
        return { ok: false, error: typeof result.payload === "string" ? result.payload : undefined };
      }
      invalidatePlanLimits();
      const id = result.payload.id;
      setTimetableId(id);
      return { ok: true, timetableId: id, topicsReady: await generate(id) };
    },
    [dispatch, generate]
  );

  /** Tries the topics again for the turma just created. */
  const retryTopics = useCallback(
    () => (timetableId ? generate(timetableId) : Promise.resolve(false)),
    [timetableId, generate]
  );

  return { phase, busy, timetableId, create, retryTopics };
}

/** GenerationProgress step index for each phase: create → topics → ready. */
export function classCreationStep(phase: ClassCreationPhase): number {
  return phase === "creating" ? 0 : phase === "topics" ? 1 : 2;
}
