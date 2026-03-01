/**
 * Community Library Redux Slice
 * Manages state for Community Library features:
 * - Resource discovery (Mariana's Sunday experience)
 * - Resource sharing (Ricardo's contribution workflow)
 * - Contributor analytics (Ricardo's recognition dashboard)
 */

import {
  discoverResources,
  getContributorStats,
  getMyResources,
  getResource,
  reuseResource,
  shareResource,
  type ContributorStats,
  type DiscoverResourcesParams,
  type PaginatedResponse,
  type ShareResourceRequest,
  type SharedResource,
} from "@/services/api/community.service";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

// ============================================================================
// STATE INTERFACE
// ============================================================================

export interface CommunityFilters {
  grade?: string;
  subject?: string;
  resourceType?: string;
  search?: string;
  sortBy?: "popular" | "recent";
}

interface CommunityState {
  // Discovery state (Mariana's browsing)
  resources: SharedResource[];
  pagination: {
    page: number;
    size: number;
    totalCount: number;
    totalPages: number;
  };
  filters: CommunityFilters;
  isLoadingResources: boolean;

  // Selected resource (for preview/details)
  selectedResource: SharedResource | null;
  isLoadingResource: boolean;

  // My resources (Ricardo's contributions)
  myResources: SharedResource[];
  isLoadingMyResources: boolean;

  // Contributor stats (Ricardo's recognition)
  contributorStats: ContributorStats | null;
  isLoadingStats: boolean;

  // Sharing state
  isSharing: boolean;
  shareSuccess: boolean;

  // Reuse state
  isReusing: boolean;
  reusedResource: SharedResource | null;

  // Error handling
  error: string | null;
}

const initialState: CommunityState = {
  resources: [],
  pagination: {
    page: 0,
    size: 20,
    totalCount: 0,
    totalPages: 0,
  },
  filters: {
    sortBy: "popular",
  },
  isLoadingResources: false,

  selectedResource: null,
  isLoadingResource: false,

  myResources: [],
  isLoadingMyResources: false,

  contributorStats: null,
  isLoadingStats: false,

  isSharing: false,
  shareSuccess: false,

  isReusing: false,
  reusedResource: null,

  error: null,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

/**
 * Discover resources with filtering (Mariana's Sunday search)
 */
export const fetchResources = createAsyncThunk(
  "community/fetchResources",
  async (
    params: DiscoverResourcesParams,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { community: CommunityState };
      const { filters, pagination } = state.community;
      
      const response = await discoverResources({
        ...filters,
        ...params,
        page: params.page ?? pagination.page,
        size: params.size ?? pagination.size,
      });
      
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load resources"
      );
    }
  }
);

/**
 * Get single resource details
 */
export const fetchResource = createAsyncThunk(
  "community/fetchResource",
  async (resourceId: string, { rejectWithValue }) => {
    try {
      return await getResource(resourceId);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load resource"
      );
    }
  }
);

/**
 * Get user's own resources (Ricardo's contributions)
 */
export const fetchMyResources = createAsyncThunk(
  "community/fetchMyResources",
  async (_, { rejectWithValue }) => {
    try {
      return await getMyResources();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load your resources"
      );
    }
  }
);

/**
 * Get contributor statistics (Ricardo's recognition dashboard)
 */
export const fetchContributorStats = createAsyncThunk(
  "community/fetchContributorStats",
  async (_, { rejectWithValue }) => {
    try {
      return await getContributorStats();
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load statistics"
      );
    }
  }
);

/**
 * Share a resource with the community
 */
export const submitResource = createAsyncThunk(
  "community/submitResource",
  async (request: ShareResourceRequest, { rejectWithValue }) => {
    try {
      return await shareResource(request);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to share resource"
      );
    }
  }
);

/**
 * Reuse a resource (Mariana's time-saving workflow)
 */
export const reuseSharedResource = createAsyncThunk(
  "community/reuseResource",
  async (
    { resourceId, adaptationNotes }: { resourceId: string; adaptationNotes?: string },
    { rejectWithValue }
  ) => {
    try {
      return await reuseResource(resourceId, adaptationNotes);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to reuse resource"
      );
    }
  }
);

// ============================================================================
// SLICE
// ============================================================================

const communitySlice = createSlice({
  name: "community",
  initialState,
  reducers: {
    // Update filters
    setFilters: (state, action: PayloadAction<CommunityFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = { sortBy: "popular" };
    },
    
    // Clear selected resource
    clearSelectedResource: (state) => {
      state.selectedResource = null;
    },
    
    // Reset share success
    resetShareSuccess: (state) => {
      state.shareSuccess = false;
    },
    
    // Clear reused resource
    clearReusedResource: (state) => {
      state.reusedResource = null;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch resources
    builder
      .addCase(fetchResources.pending, (state) => {
        state.isLoadingResources = true;
        state.error = null;
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.isLoadingResources = false;
        state.resources = action.payload.items;
        state.pagination = {
          page: action.payload.page,
          size: action.payload.size,
          totalCount: action.payload.totalCount,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchResources.rejected, (state, action) => {
        state.isLoadingResources = false;
        state.error = action.payload as string;
      });

    // Fetch single resource
    builder
      .addCase(fetchResource.pending, (state) => {
        state.isLoadingResource = true;
        state.error = null;
      })
      .addCase(fetchResource.fulfilled, (state, action) => {
        state.isLoadingResource = false;
        state.selectedResource = action.payload;
      })
      .addCase(fetchResource.rejected, (state, action) => {
        state.isLoadingResource = false;
        state.error = action.payload as string;
      });

    // Fetch my resources
    builder
      .addCase(fetchMyResources.pending, (state) => {
        state.isLoadingMyResources = true;
        state.error = null;
      })
      .addCase(fetchMyResources.fulfilled, (state, action) => {
        state.isLoadingMyResources = false;
        state.myResources = action.payload;
      })
      .addCase(fetchMyResources.rejected, (state, action) => {
        state.isLoadingMyResources = false;
        state.error = action.payload as string;
      });

    // Fetch contributor stats
    builder
      .addCase(fetchContributorStats.pending, (state) => {
        state.isLoadingStats = true;
        state.error = null;
      })
      .addCase(fetchContributorStats.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.contributorStats = action.payload;
      })
      .addCase(fetchContributorStats.rejected, (state, action) => {
        state.isLoadingStats = false;
        state.error = action.payload as string;
      });

    // Submit resource
    builder
      .addCase(submitResource.pending, (state) => {
        state.isSharing = true;
        state.shareSuccess = false;
        state.error = null;
      })
      .addCase(submitResource.fulfilled, (state, action) => {
        state.isSharing = false;
        state.shareSuccess = true;
        // Add to my resources
        state.myResources = [action.payload, ...state.myResources];
      })
      .addCase(submitResource.rejected, (state, action) => {
        state.isSharing = false;
        state.error = action.payload as string;
      });

    // Reuse resource
    builder
      .addCase(reuseSharedResource.pending, (state) => {
        state.isReusing = true;
        state.error = null;
      })
      .addCase(reuseSharedResource.fulfilled, (state, action) => {
        state.isReusing = false;
        state.reusedResource = action.payload;
        // Update reuse count in resources list if present
        const idx = state.resources.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) {
          state.resources[idx] = action.payload;
        }
      })
      .addCase(reuseSharedResource.rejected, (state, action) => {
        state.isReusing = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setFilters,
  clearFilters,
  clearSelectedResource,
  resetShareSuccess,
  clearReusedResource,
  clearError,
} = communitySlice.actions;

// Export reducer
export default communitySlice.reducer;
