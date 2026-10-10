import { onboardingFreeWeek } from "@/components/onboarding-v2/freeWeek";
import type { WeekRow } from "@/components/onboarding-v2/steps/WeekLessonRow";
import { invalidatePlanLimits } from "@/hooks/usePlanLimits";
import { resolveEffectiveContentLanguage } from "@/i18n/clientLocale";
import { meService } from "@/services/api/me.service";
import {
  generateTopics,
  generateWeek,
  listLessons,
} from "@/services/api/timetable.service";
import { Routes } from "@/shared/types";
import { isUpgradeReason } from "@/shared/types/plan-limits";
import { hasTopic } from "@/shared/utils/lessonTopic";
import {
  firstLessonHrefSet,
  lessonStatusChanged,
  planGenerationRefreshRequested,
  planGenerationStarted,
  topicsLoaded,
  topicsStatusChanged,
  weekLessonsLoaded,
  weekStatusChanged,
} from "@/store/planGeneration/planGenerationSlice";
import type { AppDispatch, RootState } from "@/store/store";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import posthog from "posthog-js";

export const TOPICS_SHOWN = 4;

export interface PlanGenerationRunnerContext {
  dispatch: AppDispatch;
  getState: () => RootState;
  getToken: () => Promise<string | null>;
}

/**
 * Module-level runner for the class plan generation (year topics, then the first
 * week's lessons). It deliberately lives outside React: the onboarding overlay that
 * starts it unmounts when the teacher finishes, but the promises and the SSE stream
 * keep going and keep dispatching to the redux store (`planGeneration` slice), which
 * the dashboard card and calendar pages subscribe to.
 */
let ctx: PlanGenerationRunnerContext | null = null;
const running = { topics: false, week: false };

function refresh(c: PlanGenerationRunnerContext) {
  c.dispatch(planGenerationRefreshRequested());
}

async function runWeek(c: PlanGenerationRunnerContext, id: string, weekStart: string) {
  if (running.week) return;
  running.week = true;
  const { dispatch } = c;
  const patch = (slotId: string, status: WeekRow["status"]) =>
    dispatch(lessonStatusChanged({ id: slotId, status }));
  dispatch(weekStatusChanged("loading"));
  try {
    const week = await meService.getWeek(weekStart);
    const klass = week.classes.find((k) => k.timetableId === id);
    const lessons = (klass?.lessons ?? [])
      .filter((l) => l.slotType !== "HOLIDAY" && l.status !== "skipped" && hasTopic(l))
      .sort((a, b) => a.slotDate.localeCompare(b.slotDate));
    if (lessons.length === 0) {
      dispatch(weekStatusChanged("empty"));
      return;
    }
    dispatch(
      weekLessonsLoaded(
        lessons.map((l) => ({
          id: l.id,
          slotDate: l.slotDate,
          title: l.topicTitle,
          status: l.status === "completed" ? "ready" : l.status === "failed" ? "failed" : "pending",
        })),
      ),
    );
    dispatch(weekStatusChanged("generating"));

    let problem = false;
    await generateWeek(
      id,
      weekStart,
      {
        onSlotStart: (slotId) => patch(slotId, "generating"),
        onSlotDone: (slotId) => {
          patch(slotId, "ready");
          refresh(c);
        },
        onSlotError: (slotId) => {
          problem = true;
          patch(slotId, "failed");
        },
        onFreeLimit: (code) => {
          problem = true;
          if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
        },
        onQuotaExceeded: () => {
          problem = true;
          dispatch(setUpgradeModalOpen(true));
        },
        onError: () => {
          problem = true;
        },
      },
      c.getToken,
    );

    // The first lesson that now has a document can be opened straight away.
    const refreshed = await meService.getWeek(weekStart).catch(() => null);
    const firstDocument = refreshed?.classes
      .find((k) => k.timetableId === id)
      ?.lessons.find((l) => l.documentId);
    if (firstDocument?.documentId) {
      dispatch(firstLessonHrefSet(`${Routes.LESSON_PLAN}/${firstDocument.documentId}`));
    }
    dispatch(weekStatusChanged(problem ? "failed" : "done"));
  } catch (err) {
    posthog.captureException(err);
    dispatch(weekStatusChanged("failed"));
  } finally {
    running.week = false;
    invalidatePlanLimits();
    refresh(c);
  }
}

async function runTopics(c: PlanGenerationRunnerContext, id: string, weekStart: string) {
  if (running.topics) return;
  running.topics = true;
  const { dispatch } = c;
  dispatch(topicsStatusChanged({ status: "running", startedAt: Date.now() }));
  let ok = false;
  try {
    const { contentLanguage, interfaceLocale } = c.getState().ui;
    const language = resolveEffectiveContentLanguage(contentLanguage, interfaceLocale);
    const result = await generateTopics(id, language);
    const slots = await listLessons(id);
    dispatch(
      topicsLoaded(
        slots
          .filter((slot) => slot.slotType === "LESSON" && hasTopic(slot))
          .sort((a, b) => a.slotDate.localeCompare(b.slotDate))
          .slice(0, TOPICS_SHOWN),
      ),
    );
    ok = result.updated > 0;
    dispatch(topicsStatusChanged({ status: ok ? "done" : "failed" }));
  } catch (err) {
    posthog.captureException(err);
    dispatch(topicsStatusChanged({ status: "failed" }));
  } finally {
    running.topics = false;
    invalidatePlanLimits();
    refresh(c);
  }
  if (ok) await runWeek(c, id, weekStart);
}

/** Called right after the class is created; the work continues whatever is on screen. */
export function startPlanGeneration(c: PlanGenerationRunnerContext, timetableId: string) {
  ctx = c;
  const weekStart = onboardingFreeWeek(new Date());
  c.dispatch(planGenerationStarted({ timetableId, weekStart }));
  void runTopics(c, timetableId, weekStart);
}

/** Retry from the onboarding step or the background banner. */
export function retryPlanGeneration() {
  if (!ctx) return;
  const { timetableId, weekStart, topicsStatus } = ctx.getState().planGeneration;
  if (!timetableId || !weekStart) return;
  if (topicsStatus === "failed") void runTopics(ctx, timetableId, weekStart);
  else void runWeek(ctx, timetableId, weekStart);
}
