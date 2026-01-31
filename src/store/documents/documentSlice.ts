import {
    chatWithDocument as chatWithDocumentService,
    createDocument as createDocumentService,
    // deleteDocument as deleteDocumentService,
    getDocument as getDocumentService,
    getDocuments as getDocumentsService,
    updateDocument as updateDocumentService,
    type DocumentFilters,
} from "@/services/api";
import type {
    CreateDocumentParams,
    CreateDocumentStreamResponse,
    Document,
} from "@/shared/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export type { DocumentFilters };

export interface UpdateDocumentData {
  id: string;
  title?: string;
  content?: string;
}

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  streamInfo: CreateDocumentStreamResponse | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: DocumentFilters;
  isLoading: boolean;
  isSaving: boolean;
  isChatting: boolean;
  lastChatAnswer: string | null;
  error: string | null;
  pendingInitialPrompt: string | null;
  pendingDocumentId: string | null;
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  streamInfo: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
  },
  filters: {},
  isLoading: false,
  isSaving: false,
  isChatting: false,
  lastChatAnswer: null,
  error: null,
  pendingInitialPrompt: null,
  pendingDocumentId: null,
};

// Async Thunks
export const fetchDocuments = createAsyncThunk(
  "documents/fetchDocuments",
  async (
    {
      page = 1,
      limit = 10,
      filters,
    }: {
      page?: number;
      limit?: number;
      filters?: DocumentFilters;
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const currentFilters =
        filters ||
        (getState() as { documents: DocumentState }).documents.filters;

      const result = await getDocumentsService({
        page,
        limit,
        filters: currentFilters,
      });

      return {
        data: result.documents || [],
        page: result.pagination?.page || page,
        limit: result.pagination?.limit || limit,
        total: result.pagination?.total || 0,
        hasMore: result.pagination?.hasMore || false,
        filters: currentFilters,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch documents"
      );
    }
  }
);

export const fetchDocument = createAsyncThunk(
  "documents/fetchDocument",
  async (id: string, { rejectWithValue }) => {
    try {
      const document = await getDocumentService(id);
      setPendingInitialPrompt({
        documentId: id,
        prompt: document.metadata?.initialPrompt as string,
      });
      return document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Document not found"
      );
    }
  },
  {
    condition: (id, { getState }) => {
      const state = getState() as { documents: DocumentState };
      const { currentDocument, isLoading } = state.documents;
      if (isLoading || currentDocument?.id === id) {
        return false;
      }
      return true;
    },
  }
);

export const createDocument = createAsyncThunk(
  "documents/createDocument",
  async (params: CreateDocumentParams, { rejectWithValue }) => {
    try {
      if (!params.documentType || !params.prompt) {
        return rejectWithValue("documentType and prompt are required");
      }

      if (!params.subject || !params.schoolYear) {
        return rejectWithValue("subject and schoolYear are required");
      }

      const document = await createDocumentService(params);
      return document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create document"
      );
    }
  }
);

export const updateDocument = createAsyncThunk(
  "documents/updateDocument",
  async ({ id, title, content }: UpdateDocumentData, { rejectWithValue }) => {
    try {
      const document = await updateDocumentService(id, { title, content });
      return document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update document"
      );
    }
  }
);

export const chatWithDocument = createAsyncThunk(
  "documents/chatWithDocument",
  async (
    { id, message }: { id: string; message: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await chatWithDocumentService(id, message);
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to send chat message"
      );
    }
  }
);

// export const deleteDocument = createAsyncThunk(
//   "documents/deleteDocument",
//   async (id: string, { rejectWithValue }) => {
//     try {
//       await deleteDocumentService(id);
//       return id; // Return the id on success
//     } catch (error) {
//       return rejectWithValue(
//         error instanceof Error ? error.message : "Failed to delete document"
//       );
//     }
//   }
// );

const documentSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    setCurrentDocument(state, action) {
      state.currentDocument = action.payload;
    },
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearError(state) {
      state.error = null;
    },
    resetPagination(state) {
      state.pagination = {
        page: 1,
        limit: 10,
        total: 0,
        hasMore: false,
      };
    },
    setPendingInitialPrompt(state, action) {
      state.pendingDocumentId = action.payload.documentId;
      state.pendingInitialPrompt = action.payload.prompt;
    },
    clearPendingInitialPrompt(state) {
      state.pendingDocumentId = null;
      state.pendingInitialPrompt = null;
    },
    addDocument(state, action) {
      state.documents.unshift(action.payload);
    },
    clearStreamInfo(state) {
      state.streamInfo = null;
    },
    clearLastChatAnswer(state) {
      state.lastChatAnswer = null;
    },
    updateDocumentOptimistic(
      state,
      action: { payload: { id: string; title?: string; content?: string } }
    ) {
      const { id, title, content } = action.payload;
      if (state.currentDocument?.id === id) {
        if (title !== undefined) {
          state.currentDocument.title = title;
        }
        if (content !== undefined) {
          state.currentDocument.content = content;
        }
      }
      state.documents = state.documents.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              ...(title !== undefined && { title }),
              ...(content !== undefined && { content }),
            }
          : doc
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Documents
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.documents = action.payload.data;
        state.pagination = {
          page: action.payload.page,
          limit: action.payload.limit,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        };
        state.filters = action.payload.filters;
        state.isLoading = false;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      // Fetch Document
      .addCase(fetchDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocument.fulfilled, (state, action) => {
        state.currentDocument = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchDocument.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      // Create Document (returns stream info, not full document)
      .addCase(createDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.streamInfo = null;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.streamInfo = action.payload;
        state.isLoading = false;
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.error = action.payload as string;
        state.streamInfo = null;
        state.isLoading = false;
      })
      // Update Document
      // Note: We use optimistic updates for title changes, so we don't need to
      // update from the response. The optimistic value is kept on success,
      // and reverted on failure in the thunk itself.
      .addCase(updateDocument.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.isSaving = false;
        const updatedData = action.payload;
        // Only update from response if we have valid data with actual content
        // Skip empty responses - the optimistic update already has the correct values
        if (!updatedData?.id) {
          return;
        }
        if (state.currentDocument?.id === updatedData.id) {
          // Only update content if it's a non-empty string (actual content update)
          if (updatedData.content && updatedData.content.trim().length > 0) {
            state.currentDocument.content = updatedData.content;
          }
          // Update timestamp if provided
          if (updatedData.updatedAt) {
            state.currentDocument.updatedAt = updatedData.updatedAt;
          }
        }
        // Update in documents list
        state.documents = state.documents.map((doc) =>
          doc.id === updatedData.id
            ? {
                ...doc,
                ...(updatedData.content &&
                  updatedData.content.trim().length > 0 && {
                    content: updatedData.content,
                  }),
                ...(updatedData.updatedAt && {
                  updatedAt: updatedData.updatedAt,
                }),
              }
            : doc
        );
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      // Chat with Document
      .addCase(chatWithDocument.pending, (state) => {
        state.isChatting = true;
        state.error = null;
        state.lastChatAnswer = null;
      })
      .addCase(chatWithDocument.fulfilled, (state, action) => {
        const response = action.payload;
        // Update current document with new content
        if (state.currentDocument?.id === response.id) {
          state.currentDocument = {
            ...state.currentDocument,
            title: response.title,
            content: response.content,
            updatedAt: response.updatedAt,
          };
        }
        // Update in documents list too
        state.documents = state.documents.map((doc) =>
          doc.id === response.id
            ? {
                ...doc,
                title: response.title,
                content: response.content,
                updatedAt: response.updatedAt,
              }
            : doc
        );
        state.lastChatAnswer = response.chatAnswer;
        state.isChatting = false;
      })
      .addCase(chatWithDocument.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isChatting = false;
      });
    // // Delete Document
    // .addCase(deleteDocument.pending, (state) => {
    //   state.isLoading = true;
    //   state.error = null;
    // })
    // .addCase(deleteDocument.fulfilled, (state, action) => {
    //   const deletedId = action.payload;
    //   state.documents = state.documents.filter((doc) => doc.id !== deletedId);
    //   if (state.currentDocument?.id === deletedId) {
    //     state.currentDocument = null;
    //   }
    //   state.isLoading = false;
    // })
    // .addCase(deleteDocument.rejected, (state, action) => {
    //   state.error = action.payload as string;
    //   state.isLoading = false;
    // });
  },
});

export const {
  setCurrentDocument,
  setFilters,
  clearError,
  resetPagination,
  setPendingInitialPrompt,
  clearPendingInitialPrompt,
  addDocument,
  clearStreamInfo,
  clearLastChatAnswer,
  updateDocumentOptimistic,
} = documentSlice.actions;

export default documentSlice.reducer;
