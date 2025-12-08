"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DocumentCard } from "@/components/ui/document-card";
import { DocumentFilters } from "@/components/ui/document-filters";
import type { Document } from "@/shared/types";
import {
  getDocuments,
  deleteDocument,
  deleteDocuments,
} from "@/services/api/document.service";

import { CheckSquare, Loader2, Search, Square, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

export function DocumentsGallery() {
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

  const fetchDocuments = useCallback(
    async (page = 1, reset = false) => {
      try {
        setLoading(true);

        const result = await getDocuments({
          page,
          limit: pagination.limit,
          filters: {
            type: selectedType !== "all" ? selectedType : undefined,
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
        setDocumentCounts(result.counts);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    },
    [selectedType, pagination.limit]
  );

  // Selection handlers
  const handleSelectDocument = (documentId: string, selected: boolean) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((doc) => doc.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedDocuments.size === 0) {
      return;
    }
    setPendingDeleteId(null);
    setShowDeleteDialog(true);
  };

  const handleRequestDelete = (documentId: string) => {
    setPendingDeleteId(documentId);
    setShowDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setPendingDeleteId(null);
  };

  const confirmDelete = async () => {
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
      await fetchDocuments(1, true);
    } catch (error) {
      console.error("Error deleting documents:", error);
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const getDeleteDialogContent = () => {
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
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchDocuments(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchDocuments(pagination.page + 1, false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-semibold text-[#0B0D17]">
              Os Meus Documentos
            </h2>
          </div>

          {/* Search and Selection */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            {selectionMode && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center space-x-1"
                >
                  {selectedDocuments.size === filteredDocuments.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    {selectedDocuments.size === filteredDocuments.length
                      ? "Desselecionar tudo"
                      : "Selecionar tudo"}
                  </span>
                </Button>
                {selectedDocuments.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-[#6753FF]">
                      {selectedDocuments.size} selecionado
                      {selectedDocuments.size !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-[#6C6F80]">
                      ({filteredDocuments.length} visível
                      {filteredDocuments.length !== 1 ? "is" : ""})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deleting ? "A eliminar..." : "Eliminar"}
                    </Button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedDocuments(new Set());
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {!selectionMode && (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6C6F80] w-4 h-4" />
                  <Input
                    placeholder="Pesquisar documentos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                >
                  Selecionar
                </Button>
              </div>
            )}
          </div>
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
              <Loader2 className="w-5 h-5 animate-spin text-[#6753FF]" />
              <span className="text-[#6C6F80]">A carregar documentos...</span>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6C6F80]">
              {searchQuery
                ? "Nenhum documento encontrado para a pesquisa."
                : selectedType === "all"
                ? "Ainda não tem documentos. Crie o seu primeiro documento!"
                : "Nenhum documento encontrado para este tipo."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="flex justify-center pt-6">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  variant="outline"
                  className="px-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />A
                      carregar...
                    </>
                  ) : (
                    "Carregar mais"
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Loading More Indicator */}
        {loading && documents.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#6753FF]" />
              <span className="text-[#6C6F80]">
                A carregar mais documentos...
              </span>
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={confirmDelete}
        title={getDeleteDialogContent().title}
        description={getDeleteDialogContent().description}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}
