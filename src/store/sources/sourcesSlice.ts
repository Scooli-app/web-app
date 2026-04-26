import { deleteSource, getSource, listSources, uploadSource } from "@/services/api/sources.service";
import type { UploadSourceParams, UserSource } from "@/shared/types/sources";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface SourcesState {
  sources: UserSource[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  uploadError: string | null;
}

const initialState: SourcesState = {
  sources: [],
  loading: false,
  uploading: false,
  error: null,
  uploadError: null,
};

export const fetchSources = createAsyncThunk(
  "sources/fetchSources",
  async (_, { rejectWithValue }) => {
    try {
      return await listSources();
    } catch {
      return rejectWithValue("Não foi possível carregar as fontes");
    }
  }
);

export const uploadUserSource = createAsyncThunk(
  "sources/uploadSource",
  async (params: UploadSourceParams, { rejectWithValue }) => {
    try {
      return await uploadSource(params);
    } catch {
      return rejectWithValue("Não foi possível fazer o upload da fonte");
    }
  }
);

export const deleteUserSource = createAsyncThunk(
  "sources/deleteSource",
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteSource(id);
      return id;
    } catch {
      return rejectWithValue("Não foi possível eliminar a fonte");
    }
  }
);

export const refreshSource = createAsyncThunk(
  "sources/refreshSource",
  async (id: string, { rejectWithValue }) => {
    try {
      return await getSource(id);
    } catch {
      return rejectWithValue("Não foi possível atualizar a fonte");
    }
  }
);

const sourcesSlice = createSlice({
  name: "sources",
  initialState,
  reducers: {
    clearSourcesError(state) {
      state.error = null;
      state.uploadError = null;
    },
    updateSource(state, action: PayloadAction<UserSource>) {
      const index = state.sources.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.sources[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSources.fulfilled, (state, action) => {
        state.loading = false;
        state.sources = action.payload;
      })
      .addCase(fetchSources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(uploadUserSource.pending, (state) => {
        state.uploading = true;
        state.uploadError = null;
      })
      .addCase(uploadUserSource.fulfilled, (state, action) => {
        state.uploading = false;
        state.sources.unshift(action.payload);
      })
      .addCase(uploadUserSource.rejected, (state, action) => {
        state.uploading = false;
        state.uploadError = action.payload as string;
      })
      .addCase(deleteUserSource.fulfilled, (state, action) => {
        state.sources = state.sources.filter((s) => s.id !== action.payload);
      })
      .addCase(refreshSource.fulfilled, (state, action) => {
        const index = state.sources.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.sources[index] = action.payload;
        }
      });
  },
});

export const { clearSourcesError, updateSource } = sourcesSlice.actions;
export default sourcesSlice.reducer;
