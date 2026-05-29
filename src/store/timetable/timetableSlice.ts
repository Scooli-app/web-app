import {
  createTimetable as createTimetableService,
  deleteTimetable as deleteTimetableService,
  generateTopics as generateTopicsService,
  getTimetable as getTimetableService,
  listLessons as listLessonsService,
  listTimetables as listTimetablesService,
  skipLesson as skipLessonService,
  updateLesson as updateLessonService,
  updateTimetable as updateTimetableService,
  type CreateTimetableParams,
  type LessonSlot,
  type Timetable,
  type UpdateSlotParams,
  type UpdateTimetableParams,
} from "@/services/api/timetable.service";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface TimetableState {
  timetables: Timetable[];
  currentTimetable: Timetable | null;
  slots: LessonSlot[];
  isLoading: boolean;
  isSlotsLoading: boolean;
  isGeneratingTopics: boolean;
  error: string | null;
}

const initialState: TimetableState = {
  timetables: [],
  currentTimetable: null,
  slots: [],
  isLoading: false,
  isSlotsLoading: false,
  isGeneratingTopics: false,
  error: null,
};

export const fetchTimetables = createAsyncThunk(
  "timetable/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await listTimetablesService();
    } catch (_error) {
      return rejectWithValue("Não foi possível carregar os horários.");
    }
  }
);

export const fetchTimetable = createAsyncThunk(
  "timetable/fetchOne",
  async (id: string, { rejectWithValue }) => {
    try {
      return await getTimetableService(id);
    } catch (_error) {
      return rejectWithValue("Horário não encontrado.");
    }
  }
);

export const createTimetable = createAsyncThunk(
  "timetable/create",
  async (params: CreateTimetableParams, { rejectWithValue }) => {
    try {
      return await createTimetableService(params);
    } catch (_error) {
      return rejectWithValue("Não foi possível criar o horário.");
    }
  }
);

export const updateTimetable = createAsyncThunk(
  "timetable/update",
  async ({ id, params }: { id: string; params: UpdateTimetableParams }, { rejectWithValue }) => {
    try {
      return await updateTimetableService(id, params);
    } catch (_error) {
      return rejectWithValue("Não foi possível atualizar o horário.");
    }
  }
);

export const deleteTimetable = createAsyncThunk(
  "timetable/delete",
  async ({ id, deleteDocuments }: { id: string; deleteDocuments?: boolean }, { rejectWithValue }) => {
    try {
      await deleteTimetableService(id, deleteDocuments);
      return id;
    } catch (_error) {
      return rejectWithValue("Não foi possível eliminar o horário.");
    }
  }
);

export const fetchLessons = createAsyncThunk(
  "timetable/fetchLessons",
  async ({ timetableId, weekStart }: { timetableId: string; weekStart?: string }, { rejectWithValue }) => {
    try {
      return await listLessonsService(timetableId, weekStart);
    } catch (_error) {
      return rejectWithValue("Não foi possível carregar as aulas.");
    }
  }
);

export const updateLesson = createAsyncThunk(
  "timetable/updateLesson",
  async (
    { timetableId, lessonId, params }: { timetableId: string; lessonId: string; params: UpdateSlotParams },
    { rejectWithValue }
  ) => {
    try {
      return await updateLessonService(timetableId, lessonId, params);
    } catch (_error) {
      return rejectWithValue("Não foi possível atualizar a aula.");
    }
  }
);

export const skipLesson = createAsyncThunk(
  "timetable/skipLesson",
  async ({ timetableId, lessonId }: { timetableId: string; lessonId: string }, { rejectWithValue }) => {
    try {
      return await skipLessonService(timetableId, lessonId);
    } catch (_error) {
      return rejectWithValue("Não foi possível ignorar a aula.");
    }
  }
);

export const generateTopics = createAsyncThunk(
  "timetable/generateTopics",
  async (timetableId: string, { rejectWithValue }) => {
    try {
      return await generateTopicsService(timetableId);
    } catch (_error) {
      return rejectWithValue("Não foi possível gerar os tópicos.");
    }
  }
);

const timetableSlice = createSlice({
  name: "timetable",
  initialState,
  reducers: {
    setSlotStatus(
      state,
      action: PayloadAction<{ slotId: string; status: LessonSlot["status"] }>
    ) {
      const slot = state.slots.find((s) => s.id === action.payload.slotId);
      if (slot) slot.status = action.payload.status;
    },
    setSlotTopicTitle(state, action: PayloadAction<{ slotId: string; topicTitle: string }>) {
      const slot = state.slots.find((s) => s.id === action.payload.slotId);
      if (slot) slot.topicTitle = action.payload.topicTitle;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTimetables
      .addCase(fetchTimetables.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTimetables.fulfilled, (state, action) => {
        state.isLoading = false;
        state.timetables = action.payload;
      })
      .addCase(fetchTimetables.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetchTimetable
      .addCase(fetchTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTimetable = action.payload;
      })
      .addCase(fetchTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // createTimetable
      .addCase(createTimetable.fulfilled, (state, action) => {
        state.timetables.unshift(action.payload);
        state.currentTimetable = action.payload;
      })
      // updateTimetable
      .addCase(updateTimetable.fulfilled, (state, action) => {
        const idx = state.timetables.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.timetables[idx] = action.payload;
        if (state.currentTimetable?.id === action.payload.id) {
          state.currentTimetable = action.payload;
        }
      })
      // deleteTimetable
      .addCase(deleteTimetable.fulfilled, (state, action) => {
        state.timetables = state.timetables.filter((t) => t.id !== action.payload);
        if (state.currentTimetable?.id === action.payload) {
          state.currentTimetable = null;
        }
      })
      // fetchLessons
      .addCase(fetchLessons.pending, (state) => {
        state.isSlotsLoading = true;
      })
      .addCase(fetchLessons.fulfilled, (state, action) => {
        state.isSlotsLoading = false;
        state.slots = action.payload;
      })
      .addCase(fetchLessons.rejected, (state, action) => {
        state.isSlotsLoading = false;
        state.error = action.payload as string;
      })
      // updateLesson / skipLesson
      .addCase(updateLesson.fulfilled, (state, action) => {
        const idx = state.slots.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.slots[idx] = action.payload;
      })
      .addCase(skipLesson.fulfilled, (state, action) => {
        const idx = state.slots.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.slots[idx] = action.payload;
      })
      // generateTopics
      .addCase(generateTopics.pending, (state) => {
        state.isGeneratingTopics = true;
      })
      .addCase(generateTopics.fulfilled, (state) => {
        state.isGeneratingTopics = false;
      })
      .addCase(generateTopics.rejected, (state, action) => {
        state.isGeneratingTopics = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSlotStatus, setSlotTopicTitle, clearError } = timetableSlice.actions;
export default timetableSlice.reducer;
