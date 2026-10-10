import { onboardingFreeWeek } from "@/components/onboarding-v2/freeWeek";
import type { WeekRow } from "@/components/onboarding-v2/steps/WeekLessonRow";
import { invalidatePlanLimits } from "@/hooks/usePlanLimits";
import { resolveEffectiveContentLanguage } from "@/i18n/clientLocale";
import { meService } from "@/services/api/me.service";
import {
  generateTopics,
  generateWeek,
  listLessons,
  listTimetables,
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
let resumeAttempted = false;

function track(
  event: "plan_generation_started" | "plan_generation_completed" | "plan_generation_failed",
  stage: "topics" | "week",
  startedAt: number,
  extra: Record<string, number> = {},
) {
  posthog.capture(event, {
    stage,
    ...(event === "plan_generation_started" ? {} : { duration_ms: Date.now() - startedAt }),
    ...extra,
  });
}

function refresh(c: PlanGenerationRunnerContext) {
  c.dispatch(planGenerationRefreshRequested());
}

async function runWeek(c: PlanGenerationRunnerContext, id: string, weekStart: string) {
  if (running.week) return;
  running.week = true;
  const startedAt = Date.now();
  let lessonsReady = 0;
  track("plan_generation_started", "week", startedAt);
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
      track("plan_generation_completed", "week", startedAt, { lessons_ready: 0 });
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
          lessonsReady += 1;
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
    track(problem ? "plan_generation_failed" : "plan_generation_completed", "week", startedAt, {
      lessons_ready: lessonsReady,
    });
  } catch (err) {
    posthog.captureException(err);
    dispatch(weekStatusChanged("failed"));
    track("plan_generation_failed", "week", startedAt, { lessons_ready: lessonsReady });
  } finally {
    running.week = false;
    invalidatePlanLimits();
    refresh(c);
  }
}

async function runTopics(c: PlanGenerationRunnerContext, id: string, weekStart: string) {
  if (running.topics) return;
  running.topics = true;
  const startedAt = Date.now();
  track("plan_generation_started", "topics", startedAt);
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
    track(ok ? "plan_generation_completed" : "plan_generation_failed", "topics", startedAt, {
      topics_count: result.updated,
    });
  } catch (err) {
    posthog.captureException(err);
    dispatch(topicsStatusChanged({ status: "failed" }));
    track("plan_generation_failed", "topics", startedAt, { topics_count: 0 });
  } finally {
    running.topics = false;
    invalidatePlanLimits();
    refresh(c);
  }
  if (ok) await runWeek(c, id, weekStart);
}

/** Called right after the class is created; the work continues whatever is on screen. */
export function startPlanGeneration(
  c: PlanGenerationRunnerContext,
  timetableId: string,
  weekStartOverride?: string,
) {
  ctx = c;
  // Never run twice for the same class (double click, resume racing the flow).
  if (running.topics || running.week) return;
  const weekStart = weekStartOverride ?? onboardingFreeWeek(new Date());
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

/** App-level context so Retry works after a reload, not only from the onboarding flow. */
export function setPlanGenerationContext(c: PlanGenerationRunnerContext) {
  ctx = c;
}

const needsWork = (l: { slotType: string; status: string; topicTitle: string }) =>
  l.slotType !== "HOLIDAY" && hasTopic(l) && (l.status === "pending" || l.status === "generating");

/**
 * After a reload (tab closed mid-generation): if the first class still has lessons
 * without topics, or pending lessons in its free week, finish the plan. Runs once per
 * page load and never while a run (or an already started plan) exists.
 */
export async function resumePlanGenerationIfNeeded(c: PlanGenerationRunnerContext) {
  ctx = c;
  if (resumeAttempted) return;
  resumeAttempted = true;
  const idle = () =>
    !running.topics && !running.week && !c.getState().planGeneration.timetableId;
  try {
    if (!idle()) return;
    const first = (await listTimetables()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )[0];
    if (!first) return;
    const slots = await listLessons(first.id);
    const topicsMissing = slots.some(
      (s) => s.slotType === "LESSON" && s.status !== "skipped" && !hasTopic(s),
    );

    const now = new Date();
    const current = onboardingFreeWeek(now);
    const previous = onboardingFreeWeek(new Date(now.getTime() - 7 * 86400000));
    const weekOf = async (weekStart: string) => {
      const week = await meService.getWeek(weekStart).catch(() => null);
      return week?.classes.find((k) => k.timetableId === first.id)?.lessons ?? [];
    };

    // The free week is fixed once chosen: if it was already started in an earlier
    // week (created Wed, reloaded Fri), keep finishing that one.
    let weekStart = current;
    if (!topicsMissing && previous !== current) {
      const earlier = await weekOf(previous);
      if (earlier.some((l) => l.status === "completed") && earlier.some(needsWork)) {
        weekStart = previous;
      }
    }
    if (!topicsMissing && !(await weekOf(weekStart)).some(needsWork)) return;
    if (!idle()) return;

    if (topicsMissing) {
      startPlanGeneration(c, first.id, weekStart);
    } else {
      c.dispatch(planGenerationStarted({ timetableId: first.id, weekStart }));
      c.dispatch(topicsStatusChanged({ status: "done" }));
      void runWeek(c, first.id, weekStart);
    }
  } catch (err) {
    posthog.captureException(err);
  }
}
