import {
  chatWithDocument as chatWithDocumentService,
  createDocument as createDocumentService,
  deleteDocumentImage as deleteDocumentImageService,
  // deleteDocument as deleteDocumentService,
  getDocument as getDocumentService,
  getDocumentImages as getDocumentImagesService,
  getDocuments as getDocumentsService,
  regenerateDocumentImage as regenerateDocumentImageService,
  updateDocument as updateDocumentService,
  type DocumentFilters,
} from "@/services/api";
import type {
  CreateDocumentParams,
  CreateDocumentStreamResponse,
  Document,
} from "@/shared/types";
import type {
  DocumentImage,
  DocumentSharedScope,
  SharedResourceStatus,
} from "@/shared/types/document";
import { fetchEntitlements } from "@/store/entitlements/entitlementsSlice";
import { fetchUsage } from "@/store/subscription/subscriptionSlice";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";



interface UpdateDocumentData {
  id: string;
  title?: string;
  content?: string;
}

type UpdateDocumentResult = {
  id: string;
  title?: string;
  content?: string;
  updatedAt?: string;
};

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
  images: DocumentImage[];
  isGeneratingImages: boolean;
  imageError: string | null;
}

interface SyncDocumentSharingStatePayload {
  documentId: string;
  sharedResourceStatus: SharedResourceStatus | null;
  sharedResourceId?: string | null;
  sharedScopes?: DocumentSharedScope[];
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
  images: [],
  isGeneratingImages: false,
  imageError: null,
};

const normalizeDocumentImage = (image: DocumentImage): DocumentImage => ({
  ...image,
  url: image.url ?? null,
  source:
    image.source ?? (image.kind === "exercise" ? "exercise_renderer" : "ai_generated"),
  status: image.status ?? (image.url ? "completed" : "pending"),
  contentType: image.contentType ?? null,
  placeholderToken: image.placeholderToken ?? null,
  errorMessage: image.errorMessage ?? null,
});

const normalizeDocumentImages = (images: DocumentImage[]): DocumentImage[] =>
  images.map((image) => normalizeDocumentImage(image));

const upsertDocumentImage = (
  images: DocumentImage[],
  incoming: DocumentImage
): DocumentImage[] => {
  const normalizedIncoming = normalizeDocumentImage(incoming);
  const index = images.findIndex(
    (image) =>
      image.id === normalizedIncoming.id ||
      (!!normalizedIncoming.placeholderToken &&
        image.placeholderToken === normalizedIncoming.placeholderToken)
  );

  if (index === -1) {
    return normalizeDocumentImages([...images, normalizedIncoming]);
  }

  const existing = images[index];
  const merged = normalizeDocumentImage({
    ...existing,
    ...normalizedIncoming,
    url: normalizedIncoming.url ?? existing.url ?? null,
    exerciseType: normalizedIncoming.exerciseType ?? existing.exerciseType ?? null,
    source: normalizedIncoming.source ?? existing.source ?? null,
    contentType: normalizedIncoming.contentType ?? existing.contentType ?? null,
    placeholderToken:
      normalizedIncoming.placeholderToken ?? existing.placeholderToken ?? null,
    errorMessage: normalizedIncoming.errorMessage,
  });

  return images.map((image, imageIndex) => (imageIndex === index ? merged : image));
};

// Async Thunks
const fetchDocuments = createAsyncThunk(
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
        error instanceof Error ? error.message : "Não foi possível carregar os documentos"
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
        error instanceof Error ? error.message : "Documento não encontrado"
      );
    }
  },
  {
    condition: (id, { getState }) => {
      const state = getState() as { documents: DocumentState };
      const { isLoading } = state.documents;
      if (isLoading) {
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
        return rejectWithValue("O tipo de documento e o prompt são obrigatórios");
      }

      if (!params.subject || !params.schoolYear) {
        return rejectWithValue("A disciplina e o ano escolar são obrigatórios");
      }

      const document = await createDocumentService(params);
            
      return document;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Não foi possível criar o documento"
      );
    }
  }
);

export const updateDocument = createAsyncThunk(
  "documents/updateDocument",
  async ({ id, title, content }: UpdateDocumentData, { rejectWithValue }) => {
    try {
      const document = await updateDocumentService(id, { title, content });
      return {
        id: document?.id ?? id,
        title: document?.title ?? title,
        content: document?.content ?? content,
        updatedAt: document?.updatedAt,
      } satisfies UpdateDocumentResult;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Não foi possível atualizar o documento"
      );
    }
  }
);

export const chatWithDocument = createAsyncThunk(
  "documents/chatWithDocument",
  async (
    { id, message }: { id: string; message: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await chatWithDocumentService(id, message);
      
      dispatch(fetchUsage());
      dispatch(fetchEntitlements());
      
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Não foi possível enviar a mensagem ao chat"
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
//     }
//   }
// );

export const fetchDocumentImages = createAsyncThunk(
  "documents/fetchDocumentImages",
  async (documentId: string, { rejectWithValue }) => {
    try {
      const images = await getDocumentImagesService(documentId);
      return images;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch document images"
      );
    }
  }
);

export const regenerateDocumentImage = createAsyncThunk(
  "documents/regenerateDocumentImage",
  async (
    {
      documentId,
      imageId,
      prompt,
    }: { documentId: string; imageId: string; prompt?: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const result = await regenerateDocumentImageService(documentId, imageId, prompt);
      dispatch(fetchUsage());
      dispatch(fetchEntitlements());
      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to regenerate document image"
      );
    }
  }
);

export const deleteDocumentImage = createAsyncThunk(
  "documents/deleteDocumentImage",
  async (
    { documentId, imageId }: { documentId: string; imageId: string },
    { rejectWithValue }
  ) => {
    try {
      await deleteDocumentImageService(documentId, imageId);
      return imageId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete document image"
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
    setImages(state, action: PayloadAction<DocumentImage[]>) {
      state.images = normalizeDocumentImages(action.payload);
    },
    upsertImage(state, action: PayloadAction<DocumentImage>) {
      state.images = upsertDocumentImage(state.images, action.payload);
    },
    setGeneratingImages(state, action: PayloadAction<boolean>) {
      state.isGeneratingImages = action.payload;
    },
    setImageError(state, action: PayloadAction<string | null>) {
      state.imageError = action.payload;
    },
    syncDocumentSharingState(
      state,
      action: PayloadAction<SyncDocumentSharingStatePayload>
    ) {
      const {
        documentId,
        sharedResourceStatus,
        sharedResourceId = null,
        sharedScopes = [],
      } = action.payload;

      if (state.currentDocument?.id === documentId) {
        state.currentDocument.sharedResourceStatus = sharedResourceStatus;
        state.currentDocument.sharedResourceId = sharedResourceId;
        state.currentDocument.sharedScopes = sharedScopes;
      }

      state.documents = state.documents.map((doc) =>
        doc.id === documentId
          ? {
              ...doc,
              sharedResourceStatus,
              sharedResourceId,
              sharedScopes,
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
      // The backend now returns the updated document, but we still keep a
      // request-payload fallback for save responses that omit a body.
      .addCase(updateDocument.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.isSaving = false;
        const updatedData = action.payload;
        if (!updatedData?.id) {
          return;
        }
        if (state.currentDocument?.id === updatedData.id) {
          if (updatedData.title !== undefined) {
            state.currentDocument.title = updatedData.title;
          }
          if (updatedData.content !== undefined) {
            state.currentDocument.content = updatedData.content;
          }
          if (updatedData.updatedAt) {
            state.currentDocument.updatedAt = updatedData.updatedAt;
          }
        }
        // Update in documents list
        state.documents = state.documents.map((doc) =>
          doc.id === updatedData.id
            ? {
                ...doc,
                ...(updatedData.title !== undefined && {
                  title: updatedData.title,
                }),
                ...(updatedData.content !== undefined && {
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
            ...(response.sources && { sources: response.sources }),
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
                ...(response.sources && { sources: response.sources }),
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
      })
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
      
      // Images
      .addCase(fetchDocumentImages.pending, (state) => {
        state.imageError = null;
      })
      .addCase(fetchDocumentImages.fulfilled, (state, action) => {
        state.images = normalizeDocumentImages(action.payload);
      })
      .addCase(fetchDocumentImages.rejected, (state, action) => {
        state.imageError = action.payload as string;
      })
      .addCase(regenerateDocumentImage.pending, (state, action) => {
        state.isGeneratingImages = true;
        state.imageError = null;
        state.images = state.images.map((image) =>
          image.id === action.meta.arg.imageId
            ? {
                ...image,
                status: "generating",
              }
            : image
        );
      })
      .addCase(regenerateDocumentImage.fulfilled, (state, action) => {
        state.isGeneratingImages = false;
        state.images = state.images.map((img) =>
          img.id === action.payload.id
            ? {
                ...img,
                url: action.payload.newUrl,
                alt: action.payload.alt ?? img.alt,
                status: action.payload.status ?? "completed",
                source: action.payload.source ?? img.source ?? null,
                contentType: action.payload.contentType ?? img.contentType ?? null,
                placeholderToken:
                  action.payload.placeholderToken ?? img.placeholderToken ?? null,
                errorMessage:
                  action.payload.status === "completed"
                    ? null
                    : (action.payload.errorMessage ?? img.errorMessage ?? null),
              }
            : img
        );
      })
      .addCase(regenerateDocumentImage.rejected, (state, action) => {
        state.isGeneratingImages = false;
        state.imageError = action.payload as string;
      })
      .addCase(deleteDocumentImage.fulfilled, (state, action) => {
        state.images = state.images.filter(img => img.id !== action.payload);
      })
      .addCase(deleteDocumentImage.rejected, (state, action) => {
        state.imageError = action.payload as string;
      });
  },
});

export const {
  setPendingInitialPrompt,
  clearStreamInfo,
  clearLastChatAnswer,
  updateDocumentOptimistic,
  setImages,
  upsertImage,
  setGeneratingImages,
  setImageError,
  syncDocumentSharingState,
} = documentSlice.actions;

export default documentSlice.reducer;
