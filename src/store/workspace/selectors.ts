import type { RootState } from "@/store/store";

export const selectWorkspaceContext = (state: RootState) =>
  state.workspace.context;
export const selectWorkspaceDashboard = (state: RootState) =>
  state.workspace.dashboard;
export const selectWorkspaceMembers = (state: RootState) =>
  state.workspace.members;
export const selectWorkspaceLoading = (state: RootState) =>
  state.workspace.loading;
export const selectWorkspaceReady = (state: RootState) => state.workspace.ready;
export const selectWorkspaceError = (state: RootState) => state.workspace.error;
export const selectHasOrganizationWorkspace = (state: RootState) =>
  state.workspace.context?.workspaceType === "organization";
// While the workspace loads the context is null: that is not an organization.
export const selectHasAccessibleOrganization = (state: RootState) =>
  (state.workspace.context?.organization ?? null) !== null;
export const selectIsOrganizationAdmin = (state: RootState) =>
  state.workspace.context?.organizationAdmin === true;
