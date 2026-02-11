import {
    adminFeedbackService,
    type AdminFeedbackDetail,
    type AdminFeedbackListItem,
    type AdminFeedbackMetrics,
    type FeedbackFilters
} from "@/services/api/admin-feedback.service";
import type { BugSeverity, FeedbackStatus } from "@/shared/types/feedback";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AdminFeedbackState {
  items: AdminFeedbackListItem[];
  totalItems: number;
  detail: AdminFeedbackDetail | null;
  metrics: AdminFeedbackMetrics | null;
  filters: FeedbackFilters;
  loading: boolean;
  error: string | null;
}

const initialState: AdminFeedbackState = {
  items: [],
  totalItems: 0,
  detail: null,
  metrics: null,
  filters: {
    page: 0,
    size: 20,
    type: "ALL",
    status: "ALL",
    severity: "ALL",
  },
  loading: false,
  error: null,
};

// Async Thunks
export const fetchFeedbackList = createAsyncThunk(
  "adminFeedback/fetchList",
  async (filters: FeedbackFilters, { rejectWithValue }) => {
    try {
      return await adminFeedbackService.getFeedbackList(filters);
    } catch (error) {
      return rejectWithValue((error as Error).message || "Failed to fetch feedback list");
    }
  }
);

export const fetchFeedbackDetail = createAsyncThunk(
  "adminFeedback/fetchDetail",
  async (id: string, { rejectWithValue }) => {
    try {
      return await adminFeedbackService.getFeedbackDetail(id);
    } catch (error) {
      return rejectWithValue((error as Error).message || "Failed to fetch feedback detail");
    }
  }
);

export const fetchMetrics = createAsyncThunk(
  "adminFeedback/fetchMetrics",
  async (_, { rejectWithValue }) => {
    try {
      return await adminFeedbackService.getMetrics();
    } catch (error) {
      return rejectWithValue((error as Error).message || "Failed to fetch metrics");
    }
  }
);

export const updateFeedbackStatus = createAsyncThunk(
  "adminFeedback/updateStatus",
  async ({ id, status, severity }: { id: string; status: FeedbackStatus; severity: BugSeverity }, { rejectWithValue }) => {
    try {
      await adminFeedbackService.updateStatus(id, status, severity);
      return { id, status, severity };
    } catch (error) {
      return rejectWithValue((error as Error).message || "Failed to update status");
    }
  }
);

export const addInternalNote = createAsyncThunk(
  "adminFeedback/addNote",
  async ({ id, content }: { id: string; content: string }, { rejectWithValue }) => {
    try {
      await adminFeedbackService.addNote(id, content);
      return { id, content };
    } catch (error) {
      return rejectWithValue((error as Error).message || "Failed to add note");
    }
  }
);

export const sendResponse = createAsyncThunk(
  "adminFeedback/sendResponse",
  async ({ id, content }: { id: string; content: string }, { rejectWithValue }) => {
    try {
      await adminFeedbackService.sendResponse(id, content);
      return { id, content };
    } catch (error) {
      return rejectWithValue((error as Error).message || "Failed to send response");
    }
  }
);

const adminFeedbackSlice = createSlice({
  name: "adminFeedback",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<FeedbackFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearDetail: (state) => {
      state.detail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchFeedbackList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeedbackList.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.totalItems = action.payload.total;
      })
      .addCase(fetchFeedbackList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Detail
      .addCase(fetchFeedbackDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeedbackDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.detail = action.payload;
      })
      .addCase(fetchFeedbackDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Metrics
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
      })
      // Update Status (Optimistic update or re-fetch logic can be applied here)
      .addCase(updateFeedbackStatus.fulfilled, (state, action) => {
        if (state.detail && state.detail.id === action.payload.id) {
          state.detail.status = action.payload.status;
          state.detail.severity = action.payload.severity;
        }
        // Also update list item if present
        const item = state.items.find((i) => i.id === action.payload.id);
        if (item) {
          item.status = action.payload.status;
          item.severity = action.payload.severity;
        }
      });
  },
});

export const { setFilters, clearDetail } = adminFeedbackSlice.actions;
export default adminFeedbackSlice.reducer;
