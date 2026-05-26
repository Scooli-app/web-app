import {
  createSession,
  createSlot,
  deleteSession,
  deleteSlot,
  generateLesson,
  generateTopics,
  getSession,
  listLessons,
  listSessions,
  listSlots,
  regenerateLesson,
  skipLesson,
  updateLesson,
  updateSession,
  updateSlot,
} from "@/services/api/timetable.service";
import type {
  CreateSessionRequest,
  CreateSlotRequest,
  GenerateLessonRequest,
  GenerateLessonResponse,
  LessonSlot,
  TimetableSession,
  TimetableSlot,
  UpdateLessonRequest,
  UpdateSessionRequest,
  UpdateSlotRequest,
} from "@/shared/types/timetable";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------

interface TimetableState {
  sessions: TimetableSession[];
  currentSession: TimetableSession | null;
  slots: TimetableSlot[];
  lessons: LessonSlot[];
  currentLesson: LessonSlot | null;

  // Generation
  generatingTopics: boolean;
  generatingLesson: string | null; // lessonId currently being generated
  lastGeneratedDocumentId: string | null;

  // Loading
  loadingSessions: boolean;
  loadingSlots: boolean;
  loadingLessons: boolean;

  // Errors
  error: string | null;
  slotError: string | null;
  lessonError: string | null;
  generationError: string | null;
}

const initialState: TimetableState = {
  sessions: [],
  currentSession: null,
  slots: [],
  lessons: [],
  currentLesson: null,
  generatingTopics: false,
  generatingLesson: null,
  lastGeneratedDocumentId: null,
  loadingSessions: false,
  loadingSlots: false,
  loadingLessons: false,
  error: null,
  slotError: null,
  lessonError: null,
  generationError: null,
};

// -------------------------------------------------------------------------
// Thunks — Sessions
// -------------------------------------------------------------------------

export const fetchSessions = createAsyncThunk(
  "timetable/fetchSessions",
  async (_, { rejectWithValue }) => {
    try {
      return await listSessions();
    } catch {
      return rejectWithValue("Não foi possível carregar as sessões.");
    }
  }
);

export const fetchSession = createAsyncThunk(
  "timetable/fetchSession",
  async (id: string, { rejectWithValue }) => {
    try {
      return await getSession(id);
    } catch {
      return rejectWithValue("Não foi possível carregar a sessão.");
    }
  }
);

export const createTimetableSession = createAsyncThunk(
  "timetable/createSession",
  async (req: CreateSessionRequest, { rejectWithValue }) => {
    try {
      return await createSession(req);
    } catch {
      return rejectWithValue("Não foi possível criar a sessão.");
    }
  }
);

export const updateTimetableSession = createAsyncThunk(
  "timetable/updateSession",
  async ({ id, req }: { id: string; req: UpdateSessionRequest }, { rejectWithValue }) => {
    try {
      return await updateSession(id, req);
    } catch {
      return rejectWithValue("Não foi possível atualizar a sessão.");
    }
  }
);

export const deleteTimetableSession = createAsyncThunk(
  "timetable/deleteSession",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteSession(id);
      return id;
    } catch {
      return rejectWithValue("Não foi possível eliminar a sessão.");
    }
  }
);

// -------------------------------------------------------------------------
// Thunks — Slots
// -------------------------------------------------------------------------

export const fetchSlots = createAsyncThunk(
  "timetable/fetchSlots",
  async (sessionId: string, { rejectWithValue }) => {
    try {
      return await listSlots(sessionId);
    } catch {
      return rejectWithValue("Não foi possível carregar os slots.");
    }
  }
);

export const createTimetableSlot = createAsyncThunk(
  "timetable/createSlot",
  async ({ sessionId, req }: { sessionId: string; req: CreateSlotRequest }, { rejectWithValue }) => {
    try {
      return await createSlot(sessionId, req);
    } catch {
      return rejectWithValue("Não foi possível criar o slot.");
    }
  }
);

export const updateTimetableSlot = createAsyncThunk(
  "timetable/updateSlot",
  async (
    { sessionId, slotId, req }: { sessionId: string; slotId: string; req: UpdateSlotRequest },
    { rejectWithValue }
  ) => {
    try {
      return await updateSlot(sessionId, slotId, req);
    } catch {
      return rejectWithValue("Não foi possível atualizar o slot.");
    }
  }
);

export const deleteTimetableSlot = createAsyncThunk(
  "timetable/deleteSlot",
  async ({ sessionId, slotId }: { sessionId: string; slotId: string }, { rejectWithValue }) => {
    try {
      await deleteSlot(sessionId, slotId);
      return slotId;
    } catch {
      return rejectWithValue("Não foi possível eliminar o slot.");
    }
  }
);

// -------------------------------------------------------------------------
// Thunks — Lessons
// -------------------------------------------------------------------------

export const fetchLessons = createAsyncThunk(
  "timetable/fetchLessons",
  async ({ sessionId, weekStart }: { sessionId: string; weekStart?: string }, { rejectWithValue }) => {
    try {
      return await listLessons(sessionId, weekStart);
    } catch {
      return rejectWithValue("Não foi possível carregar as aulas.");
    }
  }
);

export const updateTimetableLesson = createAsyncThunk(
  "timetable/updateLesson",
  async (
    { sessionId, lessonId, req }: { sessionId: string; lessonId: string; req: UpdateLessonRequest },
    { rejectWithValue }
  ) => {
    try {
      return await updateLesson(sessionId, lessonId, req);
    } catch {
      return rejectWithValue("Não foi possível atualizar a aula.");
    }
  }
);

export const skipTimetableLesson = createAsyncThunk(
  "timetable/skipLesson",
  async ({ sessionId, lessonId }: { sessionId: string; lessonId: string }, { rejectWithValue }) => {
    try {
      return await skipLesson(sessionId, lessonId);
    } catch {
      return rejectWithValue("Não foi possível marcar a aula como ignorada.");
    }
  }
);

// -------------------------------------------------------------------------
// Thunks — Generation
// -------------------------------------------------------------------------

export const generateTimetableTopics = createAsyncThunk(
  "timetable/generateTopics",
  async (sessionId: string, { rejectWithValue }) => {
    try {
      return await generateTopics(sessionId);
    } catch {
      return rejectWithValue("A geração de tópicos falhou.");
    }
  }
);

export const generateTimetableLesson = createAsyncThunk(
  "timetable/generateLesson",
  async (
    {
      sessionId,
      lessonId,
      req,
    }: { sessionId: string; lessonId: string; req?: GenerateLessonRequest },
    { rejectWithValue }
  ) => {
    try {
      const result = await generateLesson(sessionId, lessonId, req);
      return { lessonId, ...result };
    } catch {
      return rejectWithValue("A geração do plano de aula falhou.");
    }
  }
);

export const regenerateTimetableLesson = createAsyncThunk(
  "timetable/regenerateLesson",
  async (
    {
      sessionId,
      lessonId,
      req,
    }: { sessionId: string; lessonId: string; req?: GenerateLessonRequest },
    { rejectWithValue }
  ) => {
    try {
      const result = await regenerateLesson(sessionId, lessonId, req);
      return { lessonId, ...result };
    } catch {
      return rejectWithValue("A regeneração do plano de aula falhou.");
    }
  }
);

// -------------------------------------------------------------------------
// Slice
// -------------------------------------------------------------------------

const timetableSlice = createSlice({
  name: "timetable",
  initialState,
  reducers: {
    clearTimetableError(state) {
      state.error = null;
      state.slotError = null;
      state.lessonError = null;
      state.generationError = null;
    },
    setCurrentSession(state, action: PayloadAction<TimetableSession | null>) {
      state.currentSession = action.payload;
    },
    setCurrentLesson(state, action: PayloadAction<LessonSlot | null>) {
      state.currentLesson = action.payload;
    },
    updateLessonInList(state, action: PayloadAction<LessonSlot>) {
      const idx = state.lessons.findIndex((l) => l.id === action.payload.id);
      if (idx !== -1) state.lessons[idx] = action.payload;
    },
    clearLastGeneratedDocument(state) {
      state.lastGeneratedDocumentId = null;
    },
  },
  extraReducers: (builder) => {
    // Sessions
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.loadingSessions = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.loadingSessions = false;
        state.sessions = action.payload;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.loadingSessions = false;
        state.error = action.payload as string;
      })

      .addCase(fetchSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        const idx = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.sessions[idx] = action.payload;
        else state.sessions.unshift(action.payload);
      })

      .addCase(createTimetableSession.fulfilled, (state, action) => {
        state.sessions.unshift(action.payload);
        state.currentSession = action.payload;
      })
      .addCase(createTimetableSession.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(updateTimetableSession.fulfilled, (state, action) => {
        const idx = state.sessions.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.sessions[idx] = action.payload;
        if (state.currentSession?.id === action.payload.id) {
          state.currentSession = action.payload;
        }
      })
      .addCase(updateTimetableSession.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      .addCase(deleteTimetableSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((s) => s.id !== action.payload);
        if (state.currentSession?.id === action.payload) state.currentSession = null;
      })

    // Slots
      .addCase(fetchSlots.pending, (state) => {
        state.loadingSlots = true;
        state.slotError = null;
      })
      .addCase(fetchSlots.fulfilled, (state, action) => {
        state.loadingSlots = false;
        state.slots = action.payload;
      })
      .addCase(fetchSlots.rejected, (state, action) => {
        state.loadingSlots = false;
        state.slotError = action.payload as string;
      })

      .addCase(createTimetableSlot.fulfilled, (state, action) => {
        state.slots.push(action.payload);
      })
      .addCase(createTimetableSlot.rejected, (state, action) => {
        state.slotError = action.payload as string;
      })

      .addCase(updateTimetableSlot.fulfilled, (state, action) => {
        const idx = state.slots.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.slots[idx] = action.payload;
      })

      .addCase(deleteTimetableSlot.fulfilled, (state, action) => {
        state.slots = state.slots.filter((s) => s.id !== action.payload);
      })

    // Lessons
      .addCase(fetchLessons.pending, (state) => {
        state.loadingLessons = true;
        state.lessonError = null;
      })
      .addCase(fetchLessons.fulfilled, (state, action) => {
        state.loadingLessons = false;
        state.lessons = action.payload;
      })
      .addCase(fetchLessons.rejected, (state, action) => {
        state.loadingLessons = false;
        state.lessonError = action.payload as string;
      })

      .addCase(updateTimetableLesson.fulfilled, (state, action) => {
        const idx = state.lessons.findIndex((l) => l.id === action.payload.id);
        if (idx !== -1) state.lessons[idx] = action.payload;
        if (state.currentLesson?.id === action.payload.id) {
          state.currentLesson = action.payload;
        }
      })

      .addCase(skipTimetableLesson.fulfilled, (state, action) => {
        const idx = state.lessons.findIndex((l) => l.id === action.payload.id);
        if (idx !== -1) state.lessons[idx] = action.payload;
      })

    // Generation
      .addCase(generateTimetableTopics.pending, (state) => {
        state.generatingTopics = true;
        state.generationError = null;
      })
      .addCase(generateTimetableTopics.fulfilled, (state) => {
        state.generatingTopics = false;
      })
      .addCase(generateTimetableTopics.rejected, (state, action) => {
        state.generatingTopics = false;
        state.generationError = action.payload as string;
      })

      .addCase(generateTimetableLesson.pending, (state, action) => {
        state.generatingLesson = action.meta.arg.lessonId;
        state.generationError = null;
        // Optimistically update lesson status
        const idx = state.lessons.findIndex((l) => l.id === action.meta.arg.lessonId);
        if (idx !== -1) state.lessons[idx] = { ...state.lessons[idx], status: "generating" };
      })
      .addCase(
        generateTimetableLesson.fulfilled,
        (state, action: PayloadAction<GenerateLessonResponse & { lessonId: string }>) => {
          state.generatingLesson = null;
          state.lastGeneratedDocumentId = action.payload.documentId;
          const idx = state.lessons.findIndex((l) => l.id === action.payload.lessonId);
          if (idx !== -1) state.lessons[idx] = { ...state.lessons[idx], status: "generated" };
        }
      )
      .addCase(generateTimetableLesson.rejected, (state, action) => {
        state.generatingLesson = null;
        state.generationError = action.payload as string;
      })

      .addCase(regenerateTimetableLesson.pending, (state, action) => {
        state.generatingLesson = action.meta.arg.lessonId;
        state.generationError = null;
      })
      .addCase(
        regenerateTimetableLesson.fulfilled,
        (state, action: PayloadAction<GenerateLessonResponse & { lessonId: string }>) => {
          state.generatingLesson = null;
          state.lastGeneratedDocumentId = action.payload.documentId;
        }
      )
      .addCase(regenerateTimetableLesson.rejected, (state, action) => {
        state.generatingLesson = null;
        state.generationError = action.payload as string;
      });
  },
});

export const {
  clearTimetableError,
  setCurrentSession,
  setCurrentLesson,
  updateLessonInList,
  clearLastGeneratedDocument,
} = timetableSlice.actions;

export default timetableSlice.reducer;
