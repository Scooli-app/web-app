import {
  DocumentService,
  type DocumentFilters,
  type UpdateDocumentData,
} from "@/backend/services/documents/document.service";
import type { Document } from "@/shared/types/domain/document";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

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
    }: { page?: number; limit?: number; filters?: DocumentFilters },
    { getState, rejectWithValue }
  ) => {
    try {
      const currentFilters =
        filters ||
        (getState() as { documents: DocumentState }).documents.filters;
      const result = await DocumentService.getDocuments(
        page,
        limit,
        currentFilters
      );
      return { ...result, filters: currentFilters };
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
      const document = await DocumentService.getDocument(id);
      if (!document) {
        return rejectWithValue("Document not found");
      }
      return document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch document"
      );
    }
  }
);

export const createDocument = createAsyncThunk(
  "documents/createDocument",
  async (
    { data, userId }: { data: Partial<Document>; userId: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await DocumentService.createDocument(data, userId);
      if (result.error || !result.document) {
        return rejectWithValue(result.error || "Failed to create document");
      }
      return result.document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create document"
      );
    }
  }
);

export const updateDocument = createAsyncThunk(
  "documents/updateDocument",
  async (data: UpdateDocumentData, { rejectWithValue }) => {
    try {
      const result = await DocumentService.updateDocument(data);
      if (result.error || !result.document) {
        return rejectWithValue(result.error || "Failed to update document");
      }
      return result.document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update document"
      );
    }
  }
);

export const deleteDocument = createAsyncThunk(
  "documents/deleteDocument",
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await DocumentService.deleteDocument(id);
      if (result.error) {
        return rejectWithValue(result.error || "Failed to delete document");
      }
      return id; // Return the id on success
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    }
  }
);

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
      })
      // Delete Document
      .addCase(deleteDocument.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.documents = state.documents.filter((doc) => doc.id !== deletedId);
        if (state.currentDocument?.id === deletedId) {
          state.currentDocument = null;
        }
        state.isLoading = false;
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      });
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
