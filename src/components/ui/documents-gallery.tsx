"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DocumentCard } from "@/components/ui/document-card";
import { DocumentFilters } from "@/components/ui/document-filters";
import { DocumentsEmptyState } from "@/components/ui/documents-empty-state";
import {
  deleteDocument,
  deleteDocuments,
  getDocuments,
  getDocumentStats,
} from "@/services/api/document.service";
import type { Document } from "@/shared/types";

import { UploadDocumentModal } from "@/components/modals/upload-document-modal";
import { useAuth } from "@clerk/nextjs";
import { CheckSquare, Loader2, Search, Square, Trash2, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Button } from "./button";
import { Input } from "./input";

// Debounce hook for search
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function DocumentsGallery() {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    hasMore: false,
  });
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>(
    {}
  );

  // Debounce search query for performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Track if initial load is complete
  const initialLoadRef = useRef(false);
  const isAuthReady = isAuthLoaded && Boolean(isSignedIn);

  const fetchDocumentCounts = useCallback(async () => {
    if (!isAuthReady) {
      return;
    }

    try {
      const stats = await getDocumentStats();
      setDocumentCounts(stats.byType);
    } catch (error) {
      console.error("Error fetching document stats:", error);
    }
  }, [isAuthReady]);

  const fetchDocuments = useCallback(
    async (page = 1, reset = false) => {
      if (!isAuthReady) {
        return;
      }

      try {
        setLoading(true);

        const result = await getDocuments({
          page,
          limit: pagination.limit,
          filters: {
            documentType: selectedType !== "all" ? selectedType : undefined,
          },
        });

        setDocuments((prev) =>
          reset ? result.documents : [...prev, ...result.documents]
        );
        setPagination((prev) => ({
          ...prev,
          page: result.pagination.page,
          total: result.pagination.total,
          hasMore: result.pagination.hasMore,
        }));
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
        initialLoadRef.current = true;
      }
    },
    [isAuthReady, selectedType, pagination.limit]
  );

  // Selection handlers - memoized
  const handleSelectDocument = useCallback((documentId: string, selected: boolean) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  }, []);

  // Memoize filtered documents
  const filteredDocuments = useMemo(() => {
    if (!debouncedSearchQuery) {
      return documents;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query)
    );
  }, [documents, debouncedSearchQuery]);

  const handleSelectAll = useCallback(() => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((doc) => doc.id)));
    }
  }, [selectedDocuments.size, filteredDocuments]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedDocuments.size === 0) {
      return;
    }
    setPendingDeleteId(null);
    setShowDeleteDialog(true);
  }, [selectedDocuments.size]);

  const handleRequestDelete = useCallback((documentId: string) => {
    setPendingDeleteId(documentId);
    setShowDeleteDialog(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setShowDeleteDialog(false);
    setPendingDeleteId(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    setShowDeleteDialog(false);
    setDeleting(true);

    try {
      if (pendingDeleteId) {
        await deleteDocument(pendingDeleteId);
      } else {
        await deleteDocuments(Array.from(selectedDocuments));
        setSelectedDocuments(new Set());
        setSelectionMode(false);
      }
      await Promise.all([fetchDocuments(1, true), fetchDocumentCounts()]);
    } catch (error) {
      console.error("Error deleting documents:", error);
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, selectedDocuments, fetchDocuments, fetchDocumentCounts]);

  const getDeleteDialogContent = useMemo(() => {
    if (pendingDeleteId) {
      return {
        title: "Eliminar documento",
        description: "Tem a certeza de que quer eliminar este documento? Esta ação não pode ser desfeita.",
      };
    }
    return {
      title: "Eliminar documentos",
      description:
        selectedDocuments.size === 1
          ? "Tem a certeza de que quer eliminar este documento? Esta ação não pode ser desfeita."
          : `Tem a certeza de que quer eliminar ${selectedDocuments.size} documentos? Esta ação não pode ser desfeita.`,
    };
  }, [pendingDeleteId, selectedDocuments.size]);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedDocuments(new Set());
  }, []);

  const handleEnterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Initial load
  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let isActive = true;
    const loadCounts = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!isActive) {
        return;
      }
      await fetchDocumentCounts();
    };

    void loadCounts();

    return () => {
      isActive = false;
    };
  }, [fetchDocumentCounts, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    setPagination((prev) => ({ ...prev, page: 1 }));
    let isActive = true;
    const loadDocuments = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!isActive) {
        return;
      }
      await fetchDocuments(1, true);
    };

    void loadDocuments();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, isAuthReady]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchDocuments(pagination.page + 1, false);
    }
  }, [pagination.hasMore, pagination.page, loading, fetchDocuments]);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
    rootMargin: "100px", // Start loading earlier
  });

  useEffect(() => {
    if (inView && pagination.hasMore && !loading) {
      loadMore();
    }
  }, [inView, pagination.hasMore, loading, loadMore]);

  // Memoize selection info
  const selectionInfo = useMemo(() => ({
    count: selectedDocuments.size,
    isAllSelected: selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0,
    visibleCount: filteredDocuments.length,
  }), [selectedDocuments.size, filteredDocuments.length]);

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Os Meus Documentos
            </h2>
          </div>

          {/* Right side: actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            {/* Upload button – always visible on desktop */}
            {!selectionMode && (
              <Button
                onClick={() => setShowUploadModal(true)}
                variant="outline"
                size="sm"
                className="hidden sm:flex flex-shrink-0"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                Importar
              </Button>
            )}

            {/* Search and Selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            {selectionMode && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center justify-center space-x-1"
                >
                  {selectionInfo.isAllSelected ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {selectionInfo.isAllSelected
                      ? "Desselecionar tudo"
                      : "Selecionar tudo"}
                  </span>
                </Button>
                {selectionInfo.count > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-primary">
                        {selectionInfo.count} selecionado
                        {selectionInfo.count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({selectionInfo.visibleCount} visível
                        {selectionInfo.visibleCount !== 1 ? "is" : ""})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                      className="bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deleting ? "A eliminar..." : "Eliminar"}
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExitSelectionMode}
                  className="sm:ml-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {!selectionMode && (
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Pesquisar documentos..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnterSelectionMode}
                  className="flex-shrink-0"
                >
                  Selecionar
                </Button>
              </div>
            )}
          </div>{/* /inner search+selection div */}
          </div>{/* /right-side actions */}
        </div>

        {/* Filters */}
        <DocumentFilters
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          documentCounts={documentCounts}
        />

        {/* Documents Grid */}
        {loading && documents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">A carregar documentos...</span>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <DocumentsEmptyState
            variant={
              debouncedSearchQuery
                ? "no-search-results"
                : selectedType === "all"
                ? "no-documents"
                : "no-filter-results"
            }
            searchQuery={debouncedSearchQuery}
            filterType={selectedType !== "all" ? selectedType : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  onDelete={handleRequestDelete}
                  selectionMode={selectionMode}
                  isSelected={selectedDocuments.has(document.id)}
                  onSelect={handleSelectDocument}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {pagination.hasMore && (
              <div ref={loadMoreRef} className="flex justify-center pt-6 pb-4">
                {loading && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      A carregar mais documentos...
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={confirmDelete}
        title={getDeleteDialogContent.title}
        description={getDeleteDialogContent.description}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
      />

      <UploadDocumentModal 
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          fetchDocuments(1, true); // Refresh list
        }}
      />
    </div>
  );
}
