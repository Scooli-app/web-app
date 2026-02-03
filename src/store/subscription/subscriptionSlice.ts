import { getCurrentSubscription, getUsageStats } from "@/services/api";
import type {
  CurrentSubscription,
  UsageStats
} from "@/shared/types/subscription";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

// Thunks for fetching data
export const fetchSubscription = createAsyncThunk(
  "subscription/fetchSubscription",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentSubscription();
    } catch {
      return rejectWithValue("Failed to fetch subscription");
    }
  }
);

export const fetchUsage = createAsyncThunk(
  "subscription/fetchUsage",
  async (_, { rejectWithValue }) => {
    try {
      return await getUsageStats();
    } catch {
      return rejectWithValue("Failed to fetch usage stats");
    }
  }
);

interface SubscriptionState {
  subscription: CurrentSubscription | null;
  usage: UsageStats | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: SubscriptionState = {
  subscription: null,
  usage: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    // Reset state on logout
    resetSubscriptionState(state) {
      state.subscription = null;
      state.usage = null;
      state.lastUpdated = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Subscription
      .addCase(fetchSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.subscription = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Usage
      .addCase(fetchUsage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsage.fulfilled, (state, action) => {
        state.loading = false;
        state.usage = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchUsage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetSubscriptionState } = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
