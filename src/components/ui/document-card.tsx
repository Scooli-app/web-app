"use client";

import { memo, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Routes, type Document } from "@/shared/types";
import { Clock, FileText, Trash2, User } from "lucide-react";
import Link from "next/link";
import { Button } from "./button";

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onSelect?: (documentId: string, selected: boolean) => void;
  onDelete?: (documentId: string) => void;
  selectionMode?: boolean;
}

// Static lookup objects - defined outside component to avoid recreating
const DOCUMENT_TYPE_LABELS: Record<Document["documentType"], string> = {
  lessonPlan: "Plano de Aula",
  test: "Teste",
  quiz: "Quiz",
  presentation: "Apresentação",
};

const DOCUMENT_TYPE_COLORS: Record<Document["documentType"], string> = {
  lessonPlan: "bg-primary text-primary-foreground",
  test: "bg-orange-500 text-white dark:bg-orange-600",
  quiz: "bg-amber-500 text-white dark:bg-amber-600",
  presentation: "bg-rose-500 text-white dark:bg-rose-600",
};

const DOCUMENT_TYPE_ICONS: Record<Document["documentType"], string> = {
  lessonPlan: "📄",
  test: "📝",
  quiz: "❓",
  presentation: "📊",
};

const ROUTE_MAP: Record<Document["documentType"], string> = {
  lessonPlan: Routes.LESSON_PLAN,
  presentation: Routes.PRESENTATION,
  test: Routes.TEST,
  quiz: Routes.QUIZ,
};

// Date formatter - reuse instance
const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function getDocumentTypeLabel(type: Document["documentType"]) {
  return DOCUMENT_TYPE_LABELS[type] || type;
}

function getDocumentTypeColor(type: Document["documentType"]) {
  return DOCUMENT_TYPE_COLORS[type] || "bg-secondary text-secondary-foreground";
}

function getDocumentIcon(type: Document["documentType"]) {
  return DOCUMENT_TYPE_ICONS[type] || "📄";
}

function getDocumentRoute(doc: Document): string {
  return `${ROUTE_MAP[doc.documentType]}/${doc.id}`;
}

function formatDate(dateString: string) {
  return dateFormatter.format(new Date(dateString));
}

function getContentPreview(content: string) {
  if (!content) {
    return "Sem conteúdo disponível";
  }

  let plainText = content
    .replace(/<[^>]*>/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");

  if (plainText.length > 120) {
    plainText = `${plainText.substring(0, 120).trim()}...`;
  }

  return plainText;
}

function DocumentCardComponent({
  document,
  isSelected = false,
  onSelect,
  onDelete,
  selectionMode = false,
}: DocumentCardProps) {
  const handleSelectionClick = useCallback(() => {
    onSelect?.(document.id, !isSelected);
  }, [document.id, isSelected, onSelect]);

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      onSelect?.(document.id, checked);
    },
    [document.id, onSelect]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete?.(document.id);
    },
    [document.id, onDelete]
  );

  // Memoize computed values
  const typeLabel = useMemo(() => getDocumentTypeLabel(document.documentType), [document.documentType]);
  const typeColor = useMemo(() => getDocumentTypeColor(document.documentType), [document.documentType]);
  const typeIcon = useMemo(() => getDocumentIcon(document.documentType), [document.documentType]);
  const documentRoute = useMemo(() => getDocumentRoute(document), [document]);
  const updatedDate = useMemo(() => formatDate(document.updatedAt), [document.updatedAt]);
  const createdDate = useMemo(() => formatDate(document.createdAt), [document.createdAt]);
  const contentPreview = useMemo(() => getContentPreview(document.content), [document.content]);

  const cardContent = (
    <>
      {selectionMode && (
        <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
          />
        </div>
      )}

      <div className={`flex flex-col h-full ${selectionMode ? "ml-6" : ""}`}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 w-full gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
            <span className="text-xl sm:text-2xl flex-shrink-0">
              {typeIcon}
            </span>
            <Badge
              className={`${typeColor} px-2 py-1 text-xs font-medium whitespace-nowrap flex-shrink-0`}
            >
              {typeLabel}
            </Badge>
          </div>
          <div className="flex items-center text-xs text-muted-foreground flex-shrink-0 md:ml-2">
            <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="whitespace-nowrap">{updatedDate}</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground line-clamp-2 leading-tight mb-3">
          {document.title}
        </h3>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4 flex-grow">
          {contentPreview}
        </p>

        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="space-y-2 mb-4">
            {typeof document.metadata.subject === "string" &&
              document.metadata.subject && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="font-medium flex-shrink-0">Disciplina:</span>
                  <span className="ml-1 truncate">{document.metadata.subject}</span>
                </div>
              )}
            {typeof document.metadata.grade === "string" &&
              document.metadata.grade && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <User className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="font-medium flex-shrink-0">Ano:</span>
                  <span className="ml-1 truncate">{document.metadata.grade}</span>
                </div>
              )}
          </div>
        )}

        <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
          <p className="text-xs text-muted-foreground truncate">
            Criado em {createdDate}
          </p>
          {!selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="action-button p-1 h-auto w-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );

  const cardClassName = `p-4 sm:p-6 transition-all duration-200 border border-border relative flex flex-col h-full w-full ${
    selectionMode
      ? "cursor-default"
      : "cursor-pointer hover:shadow-lg hover:border-primary/20"
  } ${isSelected ? "border-primary bg-primary/5" : ""}`;

  if (selectionMode) {
    return (
      <Card className={cardClassName} onClick={handleSelectionClick}>
        {cardContent}
      </Card>
    );
  }

  return (
    <Link href={documentRoute} className="block h-full" prefetch={false}>
      <Card className={cardClassName}>{cardContent}</Card>
    </Link>
  );
}

// Memoize the component with custom comparison
export const DocumentCard = memo(DocumentCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.document.id === nextProps.document.id &&
    prevProps.document.title === nextProps.document.title &&
    prevProps.document.content === nextProps.document.content &&
    prevProps.document.updatedAt === nextProps.document.updatedAt &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode
  );
});

DocumentCard.displayName = "DocumentCard";
