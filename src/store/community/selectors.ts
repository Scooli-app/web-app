/**
 * Community Library Selectors
 * Memoized selectors for community state
 */

import type { RootState } from "@/store/store";

// Base selector


// Discovery selectors
export const selectResources = (state: RootState) => state.community.resources;
export const selectPagination = (state: RootState) => state.community.pagination;
export const selectFilters = (state: RootState) => state.community.filters;
export const selectIsLoadingResources = (state: RootState) =>
  state.community.isLoadingResources;

// Selected resource



// My resources (Ricardo's contributions)
export const selectMyResources = (state: RootState) => state.community.myResources;


// Contributor stats (Ricardo's recognition)
export const selectContributorStats = (state: RootState) =>
  state.community.contributorStats;
export const selectIsLoadingStats = (state: RootState) =>
  state.community.isLoadingStats;

// Sharing state



// Reuse state
export const selectIsReusing = (state: RootState) => state.community.isReusing;

export const selectReusedResourceIds = (state: RootState) =>
  state.community.reusedResourceIds;

// Error

