"use client";

import type { CreateTimetableParams } from "@/services/api/timetable.service";
import { useAppDispatch } from "@/store/hooks";
import { createTimetable, generateTopics } from "@/store/timetable/timetableSlice";
import { useCallback, useEffect, useState } from "react";

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
      setPhase("topics");
      const result = await dispatch(generateTopics(id));
      // 0 titles written means the model's answer was unusable — as good as a failure.
      const ready = generateTopics.fulfilled.match(result) && result.payload.updated > 0;
      setPhase(ready ? "done" : "failed");
      return ready;
    },
    [dispatch]
  );

  const create = useCallback(
    async (params: CreateTimetableParams): Promise<CreateClassResult> => {
      setPhase("creating");
      const result = await dispatch(createTimetable(params));
      if (!createTimetable.fulfilled.match(result)) {
        setPhase("idle");
        return { ok: false, error: typeof result.payload === "string" ? result.payload : undefined };
      }
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
