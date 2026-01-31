import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// Base selectors
const selectDocumentState = (state: RootState) => state.documents;

// Memoized selectors for better performance
export const selectDocuments = createSelector(
  [selectDocumentState],
  (documentState) => documentState.documents
);

export const selectCurrentDocument = createSelector(
  [selectDocumentState],
  (documentState) => documentState.currentDocument
);

export const selectIsLoading = createSelector(
  [selectDocumentState],
  (documentState) => documentState.isLoading
);

export const selectIsChatting = createSelector(
  [selectDocumentState],
  (documentState) => documentState.isChatting
);

export const selectStreamInfo = createSelector(
  [selectDocumentState],
  (documentState) => documentState.streamInfo
);

export const selectLastChatAnswer = createSelector(
  [selectDocumentState],
  (documentState) => documentState.lastChatAnswer
);

export const selectLastDiffChanges = createSelector(
  [selectDocumentState],
  (documentState) => documentState.lastDiffChanges
);

export const selectPagination = createSelector(
  [selectDocumentState],
  (documentState) => documentState.pagination
);

export const selectFilters = createSelector(
  [selectDocumentState],
  (documentState) => documentState.filters
);

export const selectError = createSelector(
  [selectDocumentState],
  (documentState) => documentState.error
);

// Derived selectors
export const selectDocumentById = createSelector(
  [selectDocuments, (_state: RootState, documentId: string) => documentId],
  (documents, documentId) => documents.find((doc) => doc.id === documentId)
);

export const selectHasMoreDocuments = createSelector(
  [selectPagination],
  (pagination) => pagination.hasMore
);

export const selectTotalDocuments = createSelector(
  [selectPagination],
  (pagination) => pagination.total
);

// Selector for editor state
export const selectEditorState = createSelector(
  [
    selectCurrentDocument,
    selectIsLoading,
    selectStreamInfo,
    selectIsChatting,
    selectLastChatAnswer,
    selectLastDiffChanges,
  ],
  (
    currentDocument,
    isLoading,
    streamInfo,
    isChatting,
    lastChatAnswer,
    lastDiffChanges
  ) => ({
    currentDocument,
    isLoading,
    streamInfo,
    isChatting,
    lastChatAnswer,
    lastDiffChanges,
  })
);

// Selector for checking if a document is being generated
export const selectIsGenerating = createSelector(
  [selectStreamInfo, (_state: RootState, documentId: string) => documentId],
  (streamInfo, documentId) =>
    streamInfo?.id === documentId && streamInfo?.status === "generating"
);
