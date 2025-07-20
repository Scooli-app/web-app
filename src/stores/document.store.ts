import type { Document } from "@/lib/types";
import {
  DocumentService,
  type CreateDocumentData,
  type DocumentFilters,
  type UpdateDocumentData,
} from "@/services/api/document.service";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface DocumentState {
  // State
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

  // Actions
  fetchDocuments: (
    page?: number,
    limit?: number,
    filters?: DocumentFilters
  ) => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  createDocument: (data: CreateDocumentData, userId: string) => Promise<void>;
  updateDocument: (data: UpdateDocumentData) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  incrementDownloads: (id: string) => Promise<void>;
  rateDocument: (id: string, rating: number) => Promise<void>;
  setCurrentDocument: (document: Document | null) => void;
  setFilters: (filters: Partial<DocumentFilters>) => void;
  clearError: () => void;
  resetPagination: () => void;
}

export const useDocumentStore = create<DocumentState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
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

    // Actions
    fetchDocuments: async (page = 1, limit = 10, filters?: DocumentFilters) => {
      const currentFilters = filters || get().filters;

      set({ isLoading: true, error: null });

      try {
        const result = await DocumentService.getDocuments(
          page,
          limit,
          currentFilters
        );

        set({
          documents: result.data,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            hasMore: result.hasMore,
          },
          filters: currentFilters,
          isLoading: false,
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch documents",
          isLoading: false,
        });
      }
    },

    fetchDocument: async (id: string) => {
      set({ isLoading: true, error: null });

      try {
        const document = await DocumentService.getDocument(id);

        if (!document) {
          set({ error: "Document not found", isLoading: false });
          return;
        }

        set({
          currentDocument: document,
          isLoading: false,
        });
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to fetch document",
          isLoading: false,
        });
      }
    },

    createDocument: async (data: CreateDocumentData, userId: string) => {
      set({ isLoading: true, error: null });

      try {
        const result = await DocumentService.createDocument(data, userId);

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        if (result.document) {
          const { documents } = get();
          set({
            documents: [result.document, ...documents],
            isLoading: false,
          });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to create document",
          isLoading: false,
        });
      }
    },

    updateDocument: async (data: UpdateDocumentData) => {
      set({ isLoading: true, error: null });

      try {
        const result = await DocumentService.updateDocument(data);

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        if (result.document) {
          const { documents, currentDocument } = get();
          const updatedDocuments = documents.map((doc) =>
            doc.id === data.id ? result.document! : doc
          );

          set({
            documents: updatedDocuments,
            currentDocument:
              currentDocument?.id === data.id
                ? result.document
                : currentDocument,
            isLoading: false,
          });
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to update document",
          isLoading: false,
        });
      }
    },

    deleteDocument: async (id: string) => {
      set({ isLoading: true, error: null });

      try {
        const result = await DocumentService.deleteDocument(id);

        if (result.error) {
          set({ error: result.error, isLoading: false });
          return;
        }

        const { documents, currentDocument } = get();
        const updatedDocuments = documents.filter((doc) => doc.id !== id);

        set({
          documents: updatedDocuments,
          currentDocument: currentDocument?.id === id ? null : currentDocument,
          isLoading: false,
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete document",
          isLoading: false,
        });
      }
    },

    incrementDownloads: async (id: string) => {
      try {
        const result = await DocumentService.incrementDownloads(id);

        if (result.error) {
          set({ error: result.error });
          return;
        }

        const { documents, currentDocument } = get();
        const updatedDocuments = documents.map((doc) =>
          doc.id === id ? { ...doc, downloads: doc.downloads + 1 } : doc
        );

        set({
          documents: updatedDocuments,
          currentDocument:
            currentDocument?.id === id
              ? { ...currentDocument, downloads: currentDocument.downloads + 1 }
              : currentDocument,
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to increment downloads",
        });
      }
    },

    rateDocument: async (id: string, rating: number) => {
      try {
        const result = await DocumentService.rateDocument(id, rating);

        if (result.error) {
          set({ error: result.error });
          return;
        }

        // Note: In a real app, you might want to fetch the updated rating from the server
        // For now, we'll just update the local state
        const { documents, currentDocument } = get();
        const updatedDocuments = documents.map((doc) =>
          doc.id === id ? { ...doc, rating } : doc
        );

        set({
          documents: updatedDocuments,
          currentDocument:
            currentDocument?.id === id
              ? { ...currentDocument, rating }
              : currentDocument,
        });
      } catch (error) {
        set({
          error:
            error instanceof Error ? error.message : "Failed to rate document",
        });
      }
    },

    setCurrentDocument: (document: Document | null) => {
      set({ currentDocument: document });
    },

    setFilters: (filters: Partial<DocumentFilters>) => {
      const currentFilters = get().filters;
      set({
        filters: { ...currentFilters, ...filters },
        pagination: { ...get().pagination, page: 1 }, // Reset to first page
      });
    },

    clearError: () => {
      set({ error: null });
    },

    resetPagination: () => {
      set({
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          hasMore: false,
        },
      });
    },
  }))
);
