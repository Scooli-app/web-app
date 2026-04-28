import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// Base selectors
const selectDocumentState = (state: RootState) => state.documents;

export const selectCurrentDocument = createSelector(
  [selectDocumentState],
  (documentState) => documentState.currentDocument
);

export const selectIsLoading = createSelector(
  [selectDocumentState],
  (documentState) => documentState.isLoading
);

const selectIsChatting = createSelector(
  [selectDocumentState],
  (documentState) => documentState.isChatting
);

const selectStreamInfo = createSelector(
  [selectDocumentState],
  (documentState) => documentState.streamInfo
);

const selectLastChatAnswer = createSelector(
  [selectDocumentState],
  (documentState) => documentState.lastChatAnswer
);

const selectImages = createSelector(
  [selectDocumentState],
  (documentState) => documentState.images
);

const selectIsGeneratingImages = createSelector(
  [selectDocumentState],
  (documentState) => documentState.isGeneratingImages
);

const selectImageError = createSelector(
  [selectDocumentState],
  (documentState) => documentState.imageError
);

// Derived selectors






// Selector for editor state
export const selectEditorState = createSelector(
  [
    selectCurrentDocument,
    selectIsLoading,
    selectStreamInfo,
    selectIsChatting,
    selectLastChatAnswer,
    selectImages,
    selectIsGeneratingImages,
    selectImageError,
  ],
  (
    currentDocument,
    isLoading,
    streamInfo,
    isChatting,
    lastChatAnswer,
    images,
    isGeneratingImages,
    imageError
  ) => ({
    currentDocument,
    isLoading,
    streamInfo,
    isChatting,
    lastChatAnswer,
    images,
    isGeneratingImages,
    imageError,
  })
);

