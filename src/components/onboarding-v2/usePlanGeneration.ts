"use client";

import {
  retryPlanGeneration,
  startPlanGeneration,
} from "@/components/onboarding-v2/planGenerationRunner";
import { useAppDispatch } from "@/store/hooks";
import { selectPlanGeneration } from "@/store/planGeneration/selectors";
import type { RootState } from "@/store/store";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { useSelector, useStore } from "react-redux";

export { TOPICS_SHOWN } from "@/components/onboarding-v2/planGenerationRunner";
export type {
  TopicsStatus,
  WeekStatus,
} from "@/store/planGeneration/planGenerationSlice";

/**
 * View over the app-level `planGeneration` slice for the onboarding steps. The work
 * itself runs in the module-level runner (planGenerationRunner), so it is not tied to
 * this hook's component: closing the onboarding overlay never cancels it.
 */
export function usePlanGeneration() {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const { getToken, userId } = useAuth();
  const state = useSelector(selectPlanGeneration);

  const start = useCallback(
    (id: string) =>
      startPlanGeneration(
        { dispatch, getState: store.getState, getToken: () => getToken(), userId },
        id,
      ),
    [dispatch, store, getToken, userId],
  );

  const overall: "working" | "done" | "failed" =
    state.status === "error" ? "failed" : state.status === "done" ? "done" : "working";

  return {
    overall,
    weekStart: state.weekStart ?? "",
    topicsStatus: state.topicsStatus,
    topics: state.topics,
    topicsStartedAt: state.topicsStartedAt,
    weekStatus: state.weekStatus,
    rows: state.lessons,
    firstLessonHref: state.firstLessonHref,
    start,
    retryTopics: retryPlanGeneration,
    retryWeek: retryPlanGeneration,
  };
}

export type PlanGeneration = ReturnType<typeof usePlanGeneration>;
