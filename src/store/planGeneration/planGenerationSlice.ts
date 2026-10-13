import type { WeekRow } from "@/components/onboarding-v2/steps/WeekLessonRow";
import type { LessonSlot } from "@/services/api/timetable.service";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type PlanGenerationStatus = "idle" | "topics" | "lessons" | "done" | "error";
export type TopicsStatus = "idle" | "running" | "done" | "failed";
export type WeekStatus = "idle" | "loading" | "generating" | "done" | "failed" | "empty";

export interface PlanGenerationState {
  status: PlanGenerationStatus;
  timetableId: string | null;
  weekStart: string | null;
  topicsStatus: TopicsStatus;
  weekStatus: WeekStatus;
  /** First week's lessons with their live status (id + status, plus display fields). */
  lessons: WeekRow[];
  /** Preview of the first generated topics (onboarding step 4). */
  topics: LessonSlot[];
  topicsStartedAt: number | null;
  firstLessonHref: string | null;
  /** Which stage failed, when status is "error". */
  error: "topics" | "week" | null;
  /** Bumped whenever new data exists server-side; pages re-fetch when it changes. */
  refreshKey: number;
}

const initialState: PlanGenerationState = {
  status: "idle",
  timetableId: null,
  weekStart: null,
  topicsStatus: "idle",
  weekStatus: "idle",
  lessons: [],
  topics: [],
  topicsStartedAt: null,
  firstLessonHref: null,
  error: null,
  refreshKey: 0,
};

function derive(state: PlanGenerationState) {
  if (!state.timetableId) {
    state.status = "idle";
    state.error = null;
    return;
  }
  if (state.topicsStatus === "failed") {
    state.status = "error";
    state.error = "topics";
  } else if (state.weekStatus === "failed") {
    state.status = "error";
    state.error = "week";
  } else if (state.weekStatus === "done" || state.weekStatus === "empty") {
    state.status = "done";
    state.error = null;
  } else if (state.topicsStatus === "done") {
    state.status = "lessons";
    state.error = null;
  } else {
    state.status = "topics";
    state.error = null;
  }
}

const planGenerationSlice = createSlice({
  name: "planGeneration",
  initialState,
  reducers: {
    planGenerationStarted(
      state,
      action: PayloadAction<{ timetableId: string; weekStart: string }>,
    ) {
      return {
        ...initialState,
        timetableId: action.payload.timetableId,
        weekStart: action.payload.weekStart,
        status: "topics",
        refreshKey: state.refreshKey,
      };
    },
    topicsStatusChanged(
      state,
      action: PayloadAction<{ status: TopicsStatus; startedAt?: number }>,
    ) {
      state.topicsStatus = action.payload.status;
      if (action.payload.startedAt !== undefined) state.topicsStartedAt = action.payload.startedAt;
      if (action.payload.status === "running") state.weekStatus = "idle";
      derive(state);
    },
    topicsLoaded(state, action: PayloadAction<LessonSlot[]>) {
      state.topics = action.payload;
    },
    weekStatusChanged(state, action: PayloadAction<WeekStatus>) {
      state.weekStatus = action.payload;
      derive(state);
    },
    weekLessonsLoaded(state, action: PayloadAction<WeekRow[]>) {
      state.lessons = action.payload;
    },
    lessonStatusChanged(
      state,
      action: PayloadAction<{ id: string; status: WeekRow["status"] }>,
    ) {
      const row = state.lessons.find((l) => l.id === action.payload.id);
      if (row) row.status = action.payload.status;
    },
    firstLessonHrefSet(state, action: PayloadAction<string | null>) {
      state.firstLessonHref = action.payload;
    },
    planGenerationRefreshRequested(state) {
      state.refreshKey += 1;
    },
  },
});

export const {
  planGenerationStarted,
  topicsStatusChanged,
  topicsLoaded,
  weekStatusChanged,
  weekLessonsLoaded,
  lessonStatusChanged,
  firstLessonHrefSet,
  planGenerationRefreshRequested,
} = planGenerationSlice.actions;

export default planGenerationSlice.reducer;
