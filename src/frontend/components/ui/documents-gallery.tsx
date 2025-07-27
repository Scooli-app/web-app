"use client";

import { DocumentCard } from "@/frontend/components/ui/document-card";
import { DocumentFilters } from "@/frontend/components/ui/document-filters";
import type { Document } from "@/shared/types/domain/document";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, Search, Trash2, CheckSquare, Square, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Input } from "./input";
import { Button } from "./button";

interface DocumentsResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

interface DocumentsGalleryProps {
  userId: string;
}

export function DocumentsGallery({ userId }: DocumentsGalleryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  });
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});

  const supabase = createClientComponentClient();

  const fetchDocuments = useCallback(
    async (page = 1, reset = false) => {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          user_id: userId,
        });

        if (selectedType !== "all") {
          params.set("type", selectedType);
        }

        // Get session and include token in request
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/documents?${params}`, {
          headers,
        });
        const data: DocumentsResponse = await response.json();

        if (response.ok) {
          if (reset || page === 1) {
            setDocuments(data.documents);
          } else {
            setDocuments((prev) => [...prev, ...data.documents]);
          }
          setPagination(data.pagination);
        } else {
          console.error("Error fetching documents:", data);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, selectedType, pagination.limit]
  );

  const fetchDocumentCounts = useCallback(async () => {
    try {
      const { data: allDocs } = await supabase
        .from("documents")
        .select("document_type")
        .eq("user_id", userId)
        .is("deleted_at", null); // Exclude soft-deleted documents

      if (allDocs) {
        const counts: Record<string, number> = {};
        allDocs.forEach((doc) => {
          counts[doc.document_type] = (counts[doc.document_type] || 0) + 1;
        });
        setDocumentCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching document counts:", error);
    }
  }, [userId, supabase]);

  // Initial load
  useEffect(() => {
    fetchDocuments(1, true);
    fetchDocumentCounts();
  }, [fetchDocuments, fetchDocumentCounts]);

  // Handle filter change
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setDocuments([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Exit selection mode when changing filters
    setSelectionMode(false);
    setSelectedDocuments(new Set());
  };

  // Refetch when filter changes
  useEffect(() => {
    if (selectedType) {
      fetchDocuments(1, true);
    }
  }, [selectedType, fetchDocuments]);

  // Infinite scroll handler
  const handleLoadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      fetchDocuments(pagination.page + 1, false);
    }
  };

  // Scroll listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        handleLoadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pagination.hasMore, loadingMore]);

  // Selection handlers
  const handleSelectDocument = (documentId: string, selected: boolean) => {
    setSelectedDocuments(prev => {
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
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) {
      return;
    }

    const confirmMessage = selectedDocuments.size === 1 
      ? "Tem a certeza de que quer eliminar este documento?"
      : `Tem a certeza de que quer eliminar ${selectedDocuments.size} documentos?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({
          ids: Array.from(selectedDocuments),
        }),
      });

      if (response.ok) {
        // Remove deleted documents from the UI
        setDocuments(prev => prev.filter(doc => !selectedDocuments.has(doc.id)));
        setSelectedDocuments(new Set());
        setSelectionMode(false);
        // Update pagination count
        setPagination(prev => ({
          ...prev,
          total: prev.total - selectedDocuments.size,
        }));
        // Refresh document counts
        fetchDocumentCounts();
      } else {
        const error = await response.json();
        alert(`Erro ao eliminar documentos: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting documents:", error);
      alert("Erro ao eliminar documentos. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (documentId: string) => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({
          ids: [documentId],
        }),
      });

      if (response.ok) {
        // Remove deleted document from the UI
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        // Update pagination count
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
        }));
        // Refresh document counts
        fetchDocumentCounts();
      } else {
        const error = await response.json();
        alert(`Erro ao eliminar documento: ${error.error}`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Erro ao eliminar documento. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter documents by search query
  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#6753FF]" />
          <p className="text-[#6C6F80]">A carregar documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-semibold text-[#0B0D17]">
            Os Meus Documentos
          </h2>
          
        </div>

        {/* Compact selection mode header */}
        {selectionMode && (
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#6753FF]/10 to-[#6753FF]/5 rounded-lg border border-[#6753FF]/20">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center space-x-2 h-8 px-3 text-sm"
              >
                {selectedDocuments.size === filteredDocuments.length ? (
                  <CheckSquare className="w-4 h-4 text-[#6753FF]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {selectedDocuments.size === filteredDocuments.length ? "Desselecionar tudo" : "Selecionar tudo"}
                </span>
              </Button>
              {selectedDocuments.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-[#6753FF]">
                    {selectedDocuments.size} selecionado{selectedDocuments.size !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-[#6C6F80]">
                    de {filteredDocuments.length}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {selectedDocuments.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleting}
                  className="flex items-center space-x-2 h-8 px-3 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedDocuments(new Set());
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative w-full flex items-center justify-between">
          <span className="flex items-center">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6C6F80]" />
            <Input
              placeholder="Pesquisar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              />
          </span>
          <div className="flex items-center space-x-4">
            <p className="text-sm text-[#6C6F80]">
              {pagination.total} documento{pagination.total !== 1 ? "s" : ""}
            </p>
            {!selectionMode && filteredDocuments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
                className="flex items-center space-x-2"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Selecionar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <DocumentFilters
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
          documentCounts={documentCounts}
        />
      </div>

      {/* Empty state */}
      {filteredDocuments.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-[#0B0D17] mb-2">
            {searchQuery
              ? "Nenhum documento encontrado"
              : selectedType === "all"
              ? "Ainda não tem documentos"
              : "Nenhum documento deste tipo"}
          </h3>
          <p className="text-[#6C6F80] max-w-md mx-auto">
            {searchQuery
              ? "Tente ajustar os termos de pesquisa ou filtros."
              : "Comece por criar o seu primeiro documento educacional."}
          </p>
        </div>
      )}

      {/* Documents grid */}
      {filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map((document) => (
            <DocumentCard 
              key={document.id} 
              document={document}
              selectionMode={selectionMode}
              isSelected={selectedDocuments.has(document.id)}
              onSelect={handleSelectDocument}
              onDelete={handleDeleteSingle}
            />
          ))}
        </div>
      )}

      {/* Load more indicator */}
      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#6753FF]" />
            <span className="text-[#6C6F80]">A carregar mais documentos...</span>
          </div>
        </div>
      )}

      {/* End of results indicator */}
      {!pagination.hasMore && documents.length > 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-[#6C6F80]">
            Chegou ao fim dos seus documentos.
          </p>
        </div>
      )}
    </div>
  );
} 