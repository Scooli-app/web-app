import { onboardingService } from "@/services/api/onboarding.service";
import type { OnboardingStatusResponse } from "@/shared/types/onboarding";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Async thunk that fetches the onboarding status for the current user.
 * Called during app bootstrap (in AppBootstrapGate) so the status is
 * available synchronously when OnboardingGate first renders — no timer
 * or MutationObserver needed.
 */
export const fetchOnboardingStatus = createAsyncThunk(
  "onboarding/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      return await onboardingService.getStatus();
    } catch {
      return rejectWithValue("Não foi possível carregar o estado de onboarding");
    }
  },
);

interface OnboardingState {
  status: OnboardingStatusResponse | null;
  isLoaded: boolean;
}

const initialState: OnboardingState = {
  status: null,
  isLoaded: false,
};

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    /** Reset on logout or identity change */
    resetOnboardingState(state) {
      state.status = null;
      state.isLoaded = false;
    },
    /** Update status after markViewed / skip / submit */
    setOnboardingStatus(state, action: PayloadAction<OnboardingStatusResponse | null>) {
      state.status = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOnboardingStatus.fulfilled, (state, action) => {
        state.status = action.payload;
        state.isLoaded = true;
      })
      .addCase(fetchOnboardingStatus.rejected, (state) => {
        // Leave status null — OnboardingGate will not open, which is safe
        state.isLoaded = true;
      });
  },
});

export const { resetOnboardingState, setOnboardingStatus } = onboardingSlice.actions;
export default onboardingSlice.reducer;
