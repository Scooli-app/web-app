import {
  createDocument as createDocumentService,
  // deleteDocument as deleteDocumentService,
  getDocument as getDocumentService,
  getDocuments as getDocumentsService,
  type DocumentFilters,
  updateDocument as updateDocumentService,
} from "@/services/api";
import type { Document } from "@/shared/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export type { DocumentFilters };

export interface UpdateDocumentData {
  id: string;
  documentType: string;
  prompt: string;
}

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: DocumentFilters;
  isLoading: boolean;
  error: string | null;
  pendingInitialPrompt: string | null;
  pendingDocumentId: string | null;
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
  },
  filters: {},
  isLoading: false,
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
      userId,
    }: {
      page?: number;
      limit?: number;
      filters?: DocumentFilters;
      userId: string;
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
        userId,
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
      return document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Document not found"
      );
    }
  }
);

export const createDocument = createAsyncThunk(
  "documents/createDocument",
  async (
    {
      data,
    }: {
      data: Partial<Document>;
      userId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      // Backend API expects documentType and prompt
      const documentType = data.documentType as string;
      const prompt =
        (data.metadata as { initialPrompt?: string })?.initialPrompt || "";

      if (!documentType || !prompt) {
        return rejectWithValue(
          "documentType and prompt (in metadata.initialPrompt) are required"
        );
      }

      const document = await createDocumentService(documentType, prompt);
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
  async (
    { id, documentType, prompt }: UpdateDocumentData,
    { rejectWithValue }
  ) => {
    try {
      const document = await updateDocumentService(id, documentType, prompt);
      return document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update document"
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
      // Create Document
      .addCase(createDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload);
        state.isLoading = false;
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      // Update Document
      .addCase(updateDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        const updatedDocument = action.payload;
        state.documents = state.documents.map((doc) =>
          doc.id === updatedDocument.id ? updatedDocument : doc
        );
        if (state.currentDocument?.id === updatedDocument.id) {
          state.currentDocument = updatedDocument;
        }
        state.isLoading = false;
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
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
} = documentSlice.actions;

export default documentSlice.reducer;
