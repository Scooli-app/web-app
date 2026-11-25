import { translate } from "@/i18n/translate";
import {
  getCurrentOrganizationDashboard,
  getCurrentOrganizationInvitations,
  getCurrentOrganizationMembers,
  getCurrentWorkspace,
} from "@/services/api";
import type {
  OrganizationDashboard,
  OrganizationInvitation,
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
      return rejectWithValue(translate("errors.workspace.fetchContextFailed"));
    }
  }
);

export const fetchOrganizationDashboard = createAsyncThunk(
  "workspace/fetchOrganizationDashboard",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentOrganizationDashboard();
    } catch {
      return rejectWithValue(translate("errors.workspace.fetchDashboardFailed"));
    }
  }
);

export const fetchOrganizationMembers = createAsyncThunk(
  "workspace/fetchOrganizationMembers",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentOrganizationMembers();
    } catch {
      return rejectWithValue(translate("errors.workspace.fetchMembersFailed"));
    }
  }
);

export const fetchOrganizationInvitations = createAsyncThunk(
  "workspace/fetchOrganizationInvitations",
  async (_, { rejectWithValue }) => {
    try {
      return await getCurrentOrganizationInvitations();
    } catch {
      return rejectWithValue(translate("errors.workspace.fetchInvitationsFailed"));
    }
  }
);

interface WorkspaceState {
  context: WorkspaceContext | null;
  dashboard: OrganizationDashboard | null;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  invitationsError: string | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  context: null,
  dashboard: null,
  members: [],
  invitations: [],
  invitationsError: null,
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
      state.invitations = [];
      state.invitationsError = null;
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
      })
      // Apart from loading/error: the members list must not wait on, or be hidden by, a Clerk hiccup.
      .addCase(fetchOrganizationInvitations.fulfilled, (state, action) => {
        state.invitations = action.payload;
        state.invitationsError = null;
      })
      .addCase(fetchOrganizationInvitations.rejected, (state, action) => {
        state.invitationsError = action.payload as string;
      });
  },
});

export const { resetWorkspaceState } = workspaceSlice.actions;

export default workspaceSlice.reducer;
