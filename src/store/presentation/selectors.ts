import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

const selectPresentationState = (state: RootState) => state.presentation;

export const selectPresentationSummaries = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.items,
);

export const selectCurrentPresentation = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.currentPresentation,
);

export const selectActiveSlideId = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.activeSlideId,
);

export const selectSelectedBlockId = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.selectedBlockId,
);

export const selectPresentationLoading = createSelector(
  [selectPresentationState],
  (presentationState) =>
    presentationState.isLoading || presentationState.isCreating,
);

export const selectPresentationSaving = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.isSaving,
);

export const selectPresentationUploading = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.isUploading,
);

export const selectPresentationDirty = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.dirty,
);

export const selectPresentationError = createSelector(
  [selectPresentationState],
  (presentationState) => presentationState.error,
);

export const selectActivePresentationSlide = createSelector(
  [selectCurrentPresentation, selectActiveSlideId],
  (presentation, activeSlideId) =>
    presentation?.content.slides.find((slide) => slide.id === activeSlideId) ??
    presentation?.content.slides[0] ??
    null,
);
