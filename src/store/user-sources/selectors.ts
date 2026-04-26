import type { RootState } from "@/store/store";

export const selectUserSources = (state: RootState) =>
  state.userSources.sources;
export const selectUserSourcesLoading = (state: RootState) =>
  state.userSources.loading;
export const selectUserSourcesUploading = (state: RootState) =>
  state.userSources.uploading;
export const selectUserSourcesError = (state: RootState) =>
  state.userSources.error;
export const selectIndexedUserSources = (state: RootState) =>
  state.userSources.sources.filter((s) => s.status === "indexed");
export const selectHasPendingSources = (state: RootState) =>
  state.userSources.sources.some(
    (s) => s.status !== "indexed" && s.status !== "failed"
  );
