import { getFeatureFlags } from "@/services/api/features.service";
import { type FeatureFlag } from "@/shared/types/featureFlags";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

/**
 * Async thunk that fetches all evaluated feature flags for the current user from GET /features.
 */
export const fetchFeatureFlags = createAsyncThunk(
  "features/fetchFeatureFlags",
  async (_, { rejectWithValue }) => {
    try {
      return await getFeatureFlags();
    } catch {
      return rejectWithValue("Não foi possível carregar as flags de funcionalidades");
    }
  }
);

interface FeaturesState {
  flags: Partial<Record<FeatureFlag, boolean>>;
  loading: boolean;
  error: string | null;
}

const initialState: FeaturesState = {
  flags: {},
  loading: false,
  error: null,
};

const featuresSlice = createSlice({
  name: "features",
  initialState,
  reducers: {
    /** Reset features on logout */
    resetFeaturesState(state) {
      state.flags = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatureFlags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeatureFlags.fulfilled, (state, action) => {
        state.loading = false;
        // Map the record (string -> boolean) into our typed Partial record
        state.flags = action.payload as Partial<Record<FeatureFlag, boolean>>;
      })
      .addCase(fetchFeatureFlags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Default all flags to false on error (fail safe)
        state.flags = {};
      });
  },
});

export const { resetFeaturesState } = featuresSlice.actions;
export default featuresSlice.reducer;
