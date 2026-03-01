/**
 * Moderation Redux Slice
 * Manages admin moderation queue state
 */

import type { SharedResource } from "@/services/api/community.service";
import {
    getModerationQueue,
    processModerationAction,
    type ModerationActionRequest,
} from "@/services/api/moderation.service";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface ModerationState {
  // Queue state
  pendingResources: SharedResource[];
  pagination: {
    page: number;
    size: number;
    totalCount: number;
    totalPages: number;
  };
  isLoadingQueue: boolean;

  // Action state
  isProcessingAction: boolean;
  lastProcessedResourceId: string | null;

  // Error handling
  error: string | null;
}

const initialState: ModerationState = {
  pendingResources: [],
  pagination: {
    page: 0,
    size: 20,
    totalCount: 0,
    totalPages: 0,
  },
  isLoadingQueue: false,

  isProcessingAction: false,
  lastProcessedResourceId: null,

  error: null,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Fetch pending resources for moderation
 */
export const fetchModerationQueue = createAsyncThunk(
  "moderation/fetchQueue",
  async (
    { page = 0, size = 20 }: { page?: number; size?: number },
    { rejectWithValue }
  ) => {
    try {
      return await getModerationQueue(page, size);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load moderation queue"
      );
    }
  }
);

/**
 * Process moderation action
 */
export const processModeration = createAsyncThunk(
  "moderation/processAction",
  async (request: ModerationActionRequest, { rejectWithValue }) => {
    try {
      const result = await processModerationAction(request);
      return { result, resourceId: request.resourceId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to process moderation action"
      );
    }
  }
);

// ============================================================================
// SLICE
// ============================================================================

const moderationSlice = createSlice({
  name: "moderation",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearLastProcessed: (state) => {
      state.lastProcessedResourceId = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch moderation queue
    builder
      .addCase(fetchModerationQueue.pending, (state) => {
        state.isLoadingQueue = true;
        state.error = null;
      })
      .addCase(fetchModerationQueue.fulfilled, (state, action) => {
        state.isLoadingQueue = false;
        state.pendingResources = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          size: action.payload.size,
          totalCount: action.payload.totalCount,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchModerationQueue.rejected, (state, action) => {
        state.isLoadingQueue = false;
        state.error = action.payload as string;
      });

    // Process moderation action
    builder
      .addCase(processModeration.pending, (state) => {
        state.isProcessingAction = true;
        state.error = null;
      })
      .addCase(processModeration.fulfilled, (state, action) => {
        state.isProcessingAction = false;
        state.lastProcessedResourceId = action.payload.resourceId;
        
        // Remove processed resource from pending list
        state.pendingResources = state.pendingResources.filter(
          (resource) => resource.id !== action.payload.resourceId
        );
        
        // Update counts
        state.pagination.totalCount = Math.max(0, state.pagination.totalCount - 1);
      })
      .addCase(processModeration.rejected, (state, action) => {
        state.isProcessingAction = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { clearError, clearLastProcessed } = moderationSlice.actions;

// Export reducer
export default moderationSlice.reducer;