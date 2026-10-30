"use client";

import { DocumentGridSkeleton, DocumentSectionsSkeleton } from "@/components/ui/document-card-skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DocumentCard } from "@/components/ui/document-card";
import { DocumentsByClass } from "@/components/ui/documents-by-class";
import {
  DocumentFilters,
  type DocumentClassOption,
  type DocumentOriginFilter,
} from "@/components/ui/document-filters";
import { listTimetables } from "@/services/api/timetable.service";
import { translateSubject } from "@/components/document-creation/constants";
import { formatClassName } from "@/shared/utils/className";
import { LoadError } from "@/components/ui/load-error";
import { DocumentsEmptyState } from "@/components/ui/documents-empty-state";
import {
  deleteDocument,
  deleteDocuments,
  getDocuments,
} from "@/services/api/document.service";
import type { Document } from "@/shared/types";

import { UploadDocumentModal } from "@/components/modals/upload-document-modal";
import { useAuth } from "@clerk/nextjs";
import { CheckSquare, Loader2, Square, Trash2, UploadCloud, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Button } from "./button";

const GROUP_BY_CLASS_KEY = "scooli.documents.groupByClass";

/** The teacher's "Agrupar por turma" choice (on unless they turned it off on this browser). */
function readGroupPreference(userId: string | null | undefined): boolean {
  if (!userId) return true;
  try {
    return window.localStorage.getItem(`${GROUP_BY_CLASS_KEY}.${userId}`) !== "off";
  } catch {
    return true;
  }
}

function writeGroupPreference(userId: string | null | undefined, grouped: boolean) {
  if (!userId) return;
  try {
    window.localStorage.setItem(`${GROUP_BY_CLASS_KEY}.${userId}`, grouped ? "on" : "off");
  } catch {
    /* private mode: the choice lasts this visit only */
  }
}

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
  const t = useTranslations("documents.gallery");
  const tTimetable = useTranslations("timetable");
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // True once an unfiltered, unsearched fetch came back with nothing: the library is truly empty.
  const [libraryEmpty, setLibraryEmpty] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedOrigin, setSelectedOrigin] = useState<DocumentOriginFilter>("all");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes, setClasses] = useState<DocumentClassOption[]>([]);
  const [groupByClass, setGroupByClass] = useState(true);
  const [classesReady, setClassesReady] = useState(false);
  // Sections refetch after a delete or an import.
  const [refreshKey, setRefreshKey] = useState(0);
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

  // Debounce search query for performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Track if initial load is complete
  const initialLoadRef = useRef(false);
  const isAuthReady = isAuthLoaded && Boolean(isSignedIn);

  useEffect(() => {
    setGroupByClass(readGroupPreference(userId));
  }, [userId]);

  const handleGroupedChange = useCallback(
    (grouped: boolean) => {
      setGroupByClass(grouped);
      writeGroupPreference(userId, grouped);
      if (grouped) setSelectedClass("");
    },
    [userId]
  );

  const fetchDocuments = useCallback(
    async (page = 1, reset = false) => {
      if (!isAuthReady) {
        return;
      }

      try {
        setLoading(true);
        setLoadFailed(false);

        const result = await getDocuments({
          page,
          limit: pagination.limit,
          filters: {
            documentType: selectedType !== "all" ? selectedType : undefined,
            subject: selectedSubject || undefined,
            gradeLevel: selectedGrade || undefined,
            timetableId: selectedClass || undefined,
            search: debouncedSearchQuery || undefined,
          },
        });

        if (page === 1) {
          setLibraryEmpty(
            result.pagination.total === 0 &&
              selectedType === "all" &&
              !selectedSubject &&
              !selectedGrade &&
              !selectedClass &&
              !debouncedSearchQuery
          );
        }
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
        setLoadFailed(true);
      } finally {
        setLoading(false);
        initialLoadRef.current = true;
      }
    },
    [isAuthReady, selectedType, selectedSubject, selectedGrade, selectedClass, debouncedSearchQuery, pagination.limit]
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

  // Origin is the only client-side filter; type, subject, grade, turma and search go to the backend
  const filteredDocuments = useMemo(() => {
    let result = documents;

    if (selectedOrigin === "imported") {
      result = result.filter((doc) => !!doc.originalFormat);
    } else if (selectedOrigin === "ai") {
      result = result.filter((doc) => !doc.originalFormat);
    }

    return result;
  }, [documents, selectedOrigin]);

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
      await fetchDocuments(1, true);
      setRefreshKey((n) => n + 1);
    } catch (error) {
      console.error("Error deleting documents:", error);
    } finally {
      setDeleting(false);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, selectedDocuments, fetchDocuments]);

  const getDeleteDialogContent = useMemo(() => {
    if (pendingDeleteId) {
      return {
        title: t("deleteDialog.singleTitle"),
        description: t("deleteDialog.singleDescription"),
      };
    }
    return {
      title: t("deleteDialog.multipleTitle"),
      description:
        selectedDocuments.size === 1
          ? t("deleteDialog.singleDescription")
          : t("deleteDialog.multipleDescription", { count: selectedDocuments.size }),
    };
  }, [pendingDeleteId, selectedDocuments.size, t]);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedDocuments(new Set());
  }, []);

  const handleEnterSelectionMode = useCallback(() => {
    setSelectionMode(true);
  }, []);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    setPagination((prev) => ({ ...prev, page: 1 }));
    // Another filter's results must not show while this one loads.
    setDocuments([]);
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
  }, [selectedType, selectedSubject, selectedGrade, selectedClass, debouncedSearchQuery, isAuthReady]);

  // The teacher's turmas, for the turma filter. Archived ones still own documents, so keep them.
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    listTimetables()
      .then((list) => {
        if (cancelled) return;
        const labels = {
          gradeShort: (grade: number) => tTimetable("gradeShort", { grade }),
          subject: translateSubject,
        };
        setClasses(list.map((tt) => ({ id: tt.id, title: formatClassName(tt, labels), color: tt.color })));
      })
      .catch(() => {
        /* no turma filter without the list; the rest of the page still works */
      })
      .finally(() => {
        if (!cancelled) setClassesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, tTimetable]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading && !loadFailed) {
      fetchDocuments(pagination.page + 1, false);
    }
  }, [pagination.hasMore, pagination.page, loading, loadFailed, fetchDocuments]);

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

  // Grouped is for browsing; picking documents to delete, or one turma's list, is a single grid.
  const showGrouped = groupByClass && classes.length > 0 && !selectedClass && !selectionMode;

  const hasFilters =
    selectedType !== "all" ||
    !!selectedSubject ||
    !!selectedGrade ||
    !!selectedClass ||
    selectedOrigin !== "all";
  const onlyTypeFilter =
    selectedType !== "all" && !selectedSubject && !selectedGrade && !selectedClass && selectedOrigin === "all";
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedSubject("");
    setSelectedGrade("");
    setSelectedClass("");
    setSelectedOrigin("all");
  };
  const emptyState = (
    <DocumentsEmptyState
      variant={debouncedSearchQuery ? "no-search-results" : hasFilters ? "no-filter-results" : "no-documents"}
      searchQuery={debouncedSearchQuery}
      filterType={onlyTypeFilter ? selectedType : undefined}
      onClearFilters={clearFilters}
    />
  );

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
              {t("heading")}
            </h2>
          </div>

          {/* Right side: actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            {/* Upload button – visible on all screen sizes */}
            {!selectionMode && (
              <Button
                onClick={() => setShowUploadModal(true)}
                variant="outline"
                size="sm"
                className="flex flex-shrink-0"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                <span>{t("import")}</span>
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
                      ? t("deselectAll")
                      : t("selectAll")}
                  </span>
                </Button>
                {selectionInfo.count > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-primary">
                        {t("selectedCount", { count: selectionInfo.count })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("visibleCount", { count: selectionInfo.visibleCount })}
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
                      {deleting ? t("deleting") : t("delete")}
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

            {!selectionMode && !libraryEmpty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterSelectionMode}
                className="flex-shrink-0"
              >
                {t("select")}
              </Button>
            )}
          </div>{/* /inner search+selection div */}
          </div>{/* /right-side actions */}
        </div>

        {/* Filters */}
        {!libraryEmpty && (
        <DocumentFilters
          search={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          grouped={groupByClass}
          onGroupedChange={handleGroupedChange}
          showClassFilter={!showGrouped}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          selectedGrade={selectedGrade}
          onGradeChange={setSelectedGrade}
          selectedOrigin={selectedOrigin}
          onOriginChange={setSelectedOrigin}
          classes={classes}
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
        />
        )}

        {/* Grouped by turma (the default), or one grid newest first */}
        {showGrouped ? (
          <DocumentsByClass
            classes={classes}
            filters={{
              documentType: selectedType !== "all" ? selectedType : undefined,
              subject: selectedSubject || undefined,
              gradeLevel: selectedGrade || undefined,
              search: debouncedSearchQuery || undefined,
              origin: selectedOrigin,
            }}
            refreshKey={refreshKey}
            onSeeAll={setSelectedClass}
            onDelete={handleRequestDelete}
            empty={emptyState}
          />
        ) : groupByClass && !classesReady ? (
          <DocumentSectionsSkeleton />
        ) : loading && documents.length === 0 ? (
          <DocumentGridSkeleton count={8} />
        ) : loadFailed && documents.length === 0 ? (
          <LoadError onRetry={() => fetchDocuments(1, true)} />
        ) : filteredDocuments.length === 0 ? (
          // Origin filters client-side, so more pages may still hold matches.
          pagination.hasMore ? (
            <div ref={loadMoreRef} className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            emptyState
          )
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

            {loadFailed && (
              <LoadError onRetry={() => fetchDocuments(pagination.page + 1, false)} />
            )}

            {/* Infinite Scroll Trigger */}
            {pagination.hasMore && (
              <div ref={loadMoreRef} className="flex justify-center pt-6 pb-4">
                {loading && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      {t("loadingMore")}
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
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={t("deleteDialog.cancel")}
        variant="danger"
      />

      <UploadDocumentModal 
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          fetchDocuments(1, true); // Refresh list
          setRefreshKey((n) => n + 1);
        }}
      />
    </div>
  );
}
