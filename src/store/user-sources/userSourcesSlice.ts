import {
  deleteSource,
  getSource,
  listSources,
  uploadSource,
} from "@/services/api/userSource.service";
import type { UploadSourceParams, UserSource } from "@/shared/types/userSource";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchUserSources = createAsyncThunk(
  "userSources/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      return await listSources();
    } catch {
      return rejectWithValue("Não foi possível carregar os teus recursos");
    }
  }
);

export const uploadUserSource = createAsyncThunk(
  "userSources/upload",
  async (params: UploadSourceParams, { rejectWithValue }) => {
    try {
      return await uploadSource(params);
    } catch {
      return rejectWithValue("Não foi possível enviar o ficheiro");
    }
  }
);

export const removeUserSource = createAsyncThunk(
  "userSources/remove",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteSource(id);
      return id;
    } catch {
      return rejectWithValue("Não foi possível eliminar o recurso");
    }
  }
);

export const refreshUserSource = createAsyncThunk(
  "userSources/refresh",
  async (id: string, { rejectWithValue }) => {
    try {
      return await getSource(id);
    } catch {
      return rejectWithValue("Não foi possível atualizar o estado do recurso");
    }
  }
);

interface UserSourcesState {
  sources: UserSource[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

const initialState: UserSourcesState = {
  sources: [],
  loading: false,
  uploading: false,
  error: null,
};

const userSourcesSlice = createSlice({
  name: "userSources",
  initialState,
  reducers: {
    resetUserSourcesState(state) {
      state.sources = [];
      state.loading = false;
      state.uploading = false;
      state.error = null;
    },
    clearUserSourcesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserSources.fulfilled, (state, action) => {
        state.loading = false;
        state.sources = action.payload;
      })
      .addCase(fetchUserSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(uploadUserSource.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadUserSource.fulfilled, (state, action) => {
        state.uploading = false;
        state.sources.unshift(action.payload);
      })
      .addCase(uploadUserSource.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload as string;
      })
      .addCase(removeUserSource.fulfilled, (state, action) => {
        state.sources = state.sources.filter((s) => s.id !== action.payload);
      })
      .addCase(refreshUserSource.fulfilled, (state, action) => {
        const idx = state.sources.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) {
          state.sources[idx] = action.payload;
        }
      });
  },
});

export const { resetUserSourcesState, clearUserSourcesError } =
  userSourcesSlice.actions;
export default userSourcesSlice.reducer;
