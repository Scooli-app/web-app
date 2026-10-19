"use client";

import { DocumentCard } from "@/components/ui/document-card";
import {
  NO_CLASS_FILTER,
  type DocumentClassOption,
  type DocumentOriginFilter,
} from "@/components/ui/document-filters";
import { getDocuments } from "@/services/api/document.service";
import type { Document } from "@/shared/types";
import { ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** One row of cards on the widest grid. */
const SECTION_SIZE = 4;

interface Section {
  id: string;
  title: string;
  color: string | null;
  documents: Document[];
  total: number;
}

interface DocumentsByClassProps {
  classes: DocumentClassOption[];
  filters: {
    documentType?: string;
    subject?: string;
    gradeLevel?: string;
    search?: string;
    origin: DocumentOriginFilter;
  };
  /** Bumped by the parent after a delete so the sections refetch. */
  refreshKey: number;
  onSeeAll: (classId: string) => void;
  onDelete: (documentId: string) => void;
  /** Rendered when no turma (and nothing outside a turma) has a matching document. */
  empty: React.ReactElement;
}

/**
 * "Os meus documentos" grouped by turma: each turma's latest documents, then those outside any
 * turma. "Ver todos" opens the full list for that turma.
 */
export function DocumentsByClass({ classes, filters, refreshKey, onSeeAll, onDelete, empty }: DocumentsByClassProps) {
  const t = useTranslations("documents.gallery");
  const tFilters = useTranslations("documents.filters");
  const [sections, setSections] = useState<Section[] | null>(null);
  const { documentType, subject, gradeLevel, search, origin } = filters;

  useEffect(() => {
    let cancelled = false;
    setSections(null);
    const groups = [
      ...classes.map((c) => ({ id: c.id, title: c.title, color: c.color as string | null })),
      { id: NO_CLASS_FILTER, title: tFilters("classes.none"), color: null },
    ];
    Promise.all(
      groups.map((group) =>
        getDocuments({
          page: 1,
          limit: SECTION_SIZE,
          filters: { documentType, subject, gradeLevel, search, timetableId: group.id },
        })
          .then((result): Section => ({ ...group, documents: result.documents, total: result.pagination.total }))
          .catch((): Section => ({ ...group, documents: [], total: 0 })),
      ),
    ).then((loaded) => {
      if (!cancelled) setSections(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [classes, documentType, subject, gradeLevel, search, refreshKey, tFilters]);

  if (!sections) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        <span className="text-muted-foreground">{t("loadingDocuments")}</span>
      </div>
    );
  }

  // Origin isn't a server filter: it narrows what each section already loaded.
  const byOrigin = (doc: Document) =>
    origin === "all" || (origin === "imported" ? !!doc.originalFormat : !doc.originalFormat);
  const visible = sections
    .map((section) => ({ ...section, documents: section.documents.filter(byOrigin) }))
    .filter((section) => section.documents.length > 0);

  if (visible.length === 0) return empty;

  return (
    <div className="space-y-8">
      {visible.map((section) => (
        <section key={section.id} aria-labelledby={`class-section-${section.id}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 id={`class-section-${section.id}`} className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
              {section.color && (
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: section.color }} />
              )}
              <span className="truncate">{section.title}</span>
              <span className="shrink-0 text-sm font-normal text-muted-foreground">
                · {t("sectionCount", { count: section.total })}
              </span>
            </h3>
            {section.total > section.documents.length && (
              <button
                type="button"
                onClick={() => onSeeAll(section.id)}
                className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary hover:underline"
              >
                {t("seeAll")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {section.documents.map((document, index) => (
              // Three columns fit three cards: the fourth waits for the four-column grid.
              <div key={document.id} className={index === 3 ? "h-full lg:hidden xl:block" : "h-full"}>
                <DocumentCard document={document} onDelete={onDelete} inClassSection={section.color !== null} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
