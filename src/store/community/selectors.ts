/**
 * Community Library Selectors
 * Memoized selectors for community state
 */

import type { RootState } from "@/store/store";

// Base selector
export const selectCommunity = (state: RootState) => state.community;

// Discovery selectors
export const selectResources = (state: RootState) => state.community.resources;
export const selectPagination = (state: RootState) => state.community.pagination;
export const selectFilters = (state: RootState) => state.community.filters;
export const selectIsLoadingResources = (state: RootState) =>
  state.community.isLoadingResources;

// Selected resource
export const selectSelectedResource = (state: RootState) =>
  state.community.selectedResource;
export const selectIsLoadingResource = (state: RootState) =>
  state.community.isLoadingResource;

// My resources (Ricardo's contributions)
export const selectMyResources = (state: RootState) => state.community.myResources;
export const selectIsLoadingMyResources = (state: RootState) =>
  state.community.isLoadingMyResources;

// Contributor stats (Ricardo's recognition)
export const selectContributorStats = (state: RootState) =>
  state.community.contributorStats;
export const selectIsLoadingStats = (state: RootState) =>
  state.community.isLoadingStats;

// Sharing state
export const selectIsSharing = (state: RootState) => state.community.isSharing;
export const selectShareSuccess = (state: RootState) => state.community.shareSuccess;

// Reuse state
export const selectIsReusing = (state: RootState) => state.community.isReusing;
export const selectReusedResource = (state: RootState) =>
  state.community.reusedResource;
export const selectReusedResourceIds = (state: RootState) =>
  state.community.reusedResourceIds;

// Error
export const selectCommunityError = (state: RootState) => state.community.error;
