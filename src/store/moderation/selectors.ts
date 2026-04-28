/**
 * Moderation Selectors
 * Memoized selectors for moderation state
 */

import type { RootState } from "@/store/store";



export const selectPendingResources = (state: RootState) => 
  state.moderation.pendingResources;

export const selectModerationPagination = (state: RootState) => 
  state.moderation.pagination;

export const selectIsLoadingQueue = (state: RootState) => 
  state.moderation.isLoadingQueue;

export const selectIsProcessingAction = (state: RootState) => 
  state.moderation.isProcessingAction;



