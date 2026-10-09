import { createListenerMiddleware } from "@reduxjs/toolkit";
import posthog from "posthog-js";
import {
  createTimetable,
  deleteTimetable,
  generateTopics,
  skipLesson,
  updateLesson,
} from "./timetable/timetableSlice";

/**
 * Product analytics for the class calendar (the first piece of Class State).
 *
 * Listens to the timetable thunks instead of sprinkling capture() calls through
 * the pages, so every entry point — the calendar page, the dashboard widget,
 * "criar a partir da planificação" — is counted the same way. Ids, subject and
 * grade only; no lesson content.
 */
export const analyticsListener = createListenerMiddleware();

type TimetableSlice = {
  timetable: {
    currentTimetable: { id: string; subject: string; gradeLevel: number } | null;
  };
};

function classContext(state: unknown, timetableId: string) {
  const current = (state as TimetableSlice).timetable.currentTimetable;
  return current?.id === timetableId
    ? { subject: current.subject, grade_level: current.gradeLevel }
    : {};
}

analyticsListener.startListening({
  actionCreator: createTimetable.fulfilled,
  effect: (action) => {
    const timetable = action.payload;
    const params = action.meta.arg;
    posthog.capture("class_calendar_created", {
      timetable_id: timetable.id,
      subject: timetable.subject,
      grade_level: timetable.gradeLevel,
      creation_mode: params.creationMode ?? "custom",
      has_linked_curriculum_plan: Boolean(params.linkedCurriculumPlan),
      weekly_slots: params.recurringSlots?.length ?? 0,
      period_start: timetable.periodStart,
      period_end: timetable.periodEnd,
    });
  },
});

analyticsListener.startListening({
  actionCreator: generateTopics.fulfilled,
  effect: (action, api) => {
    posthog.capture("class_topics_generated", {
      timetable_id: action.meta.arg,
      ...classContext(api.getState(), action.meta.arg),
    });
  },
});

analyticsListener.startListening({
  actionCreator: updateLesson.fulfilled,
  effect: (action, api) => {
    const { timetableId, lessonId, params } = action.meta.arg;
    posthog.capture("class_lesson_updated", {
      timetable_id: timetableId,
      lesson_id: lessonId,
      changed_fields: Object.keys(params),
      slot_type: params.slotType ?? null,
      ...classContext(api.getState(), timetableId),
    });
  },
});

analyticsListener.startListening({
  actionCreator: skipLesson.fulfilled,
  effect: (action, api) => {
    const { timetableId, lessonId } = action.meta.arg;
    posthog.capture("class_lesson_skipped", {
      timetable_id: timetableId,
      lesson_id: lessonId,
      ...classContext(api.getState(), timetableId),
    });
  },
});

analyticsListener.startListening({
  actionCreator: deleteTimetable.fulfilled,
  effect: (action) => {
    posthog.capture("class_calendar_deleted", {
      timetable_id: action.meta.arg.id,
      deleted_documents: Boolean(action.meta.arg.deleteDocuments),
    });
  },
});

analyticsListener.startListening({
  actionCreator: createTimetable.rejected,
  effect: (action) => {
    posthog.capture("class_calendar_action_failed", { action: "create" });
    if (action.error) posthog.captureException(action.error);
  },
});

analyticsListener.startListening({
  actionCreator: generateTopics.rejected,
  effect: (action) => {
    posthog.capture("class_calendar_action_failed", {
      action: "generate_topics",
      timetable_id: action.meta.arg,
    });
  },
});
