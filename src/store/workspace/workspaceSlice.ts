import {
  getCurrentOrganizationDashboard,
  getCurrentOrganizationMembers,
  getCurrentWorkspace,
} from "@/services/api";
import type {
  OrganizationDashboard,
  OrganizationMember,
  WorkspaceContext,
} from "@/shared/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchWorkspace = createAsyncThunk(
  "workspace/fetchWorkspace",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentWorkspace();
    } catch {
      return rejectWithValue("Não foi possível carregar o contexto de workspace");
    }
  }
);

export const fetchOrganizationDashboard = createAsyncThunk(
  "workspace/fetchOrganizationDashboard",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentOrganizationDashboard();
    } catch {
      return rejectWithValue("Não foi possível carregar o dashboard da escola");
    }
  }
);

export const fetchOrganizationMembers = createAsyncThunk(
  "workspace/fetchOrganizationMembers",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentOrganizationMembers();
    } catch {
      return rejectWithValue("Não foi possível carregar os membros da escola");
    }
  }
);

interface WorkspaceState {
  context: WorkspaceContext | null;
  dashboard: OrganizationDashboard | null;
  members: OrganizationMember[];
  loading: boolean;
  ready: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  context: null,
  dashboard: null,
  members: [],
  loading: false,
  ready: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    resetWorkspaceState(state) {
      state.context = null;
      state.dashboard = null;
      state.members = [];
      state.loading = false;
      state.ready = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspace.pending, (state) => {
        state.loading = true;
        state.ready = false;
        state.error = null;
      })
      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.ready = true;
        state.context = action.payload;
      })
      .addCase(fetchWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.ready = true;
        state.error = action.payload as string;
      })
      .addCase(fetchOrganizationDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchOrganizationDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchOrganizationMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload;
      })
      .addCase(fetchOrganizationMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetWorkspaceState } = workspaceSlice.actions;

export default workspaceSlice.reducer;
