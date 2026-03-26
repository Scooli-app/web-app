"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Routes, type Document } from "@/shared/types";
import { FileText, Trash2, User, Users } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useMemo } from "react";

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onSelect?: (documentId: string, selected: boolean) => void;
  onDelete?: (documentId: string) => void;
  selectionMode?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<Document["documentType"], string> = {
  lessonPlan: "Plano de Aula",
  worksheet: "Ficha de Trabalho",
  test: "Teste",
  quiz: "Quiz",
  presentation: "Apresentação",
};

const DOCUMENT_TYPE_COLORS: Record<Document["documentType"], string> = {
  lessonPlan: "bg-primary text-primary-foreground",
  worksheet: "bg-teal-500 text-white dark:bg-teal-600",
  test: "bg-orange-500 text-white dark:bg-orange-600",
  quiz: "bg-amber-500 text-white dark:bg-amber-600",
  presentation: "bg-rose-500 text-white dark:bg-rose-600",
};

const DOCUMENT_TYPE_ICONS: Record<Document["documentType"], string> = {
  lessonPlan: "📄",
  worksheet: "🧾",
  test: "📝",
  quiz: "❓",
  presentation: "📊",
};

const ROUTE_MAP: Record<Document["documentType"], string> = {
  lessonPlan: Routes.LESSON_PLAN,
  worksheet: Routes.WORKSHEET,
  presentation: Routes.PRESENTATION,
  test: Routes.TEST,
  quiz: Routes.QUIZ,
};

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function getDocumentRoute(document: Document): string {
  return `${ROUTE_MAP[document.documentType]}/${document.id}`;
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
  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      onSelect?.(document.id, checked);
    },
    [document.id, onSelect]
  );

  const handleDeleteClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onDelete?.(document.id);
    },
    [document.id, onDelete]
  );

  const typeLabel = useMemo(
    () => DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType,
    [document.documentType]
  );
  const typeColor = useMemo(
    () =>
      DOCUMENT_TYPE_COLORS[document.documentType] ||
      "bg-secondary text-secondary-foreground",
    [document.documentType]
  );
  const typeIcon = useMemo(
    () => DOCUMENT_TYPE_ICONS[document.documentType] || "📄",
    [document.documentType]
  );
  const documentRoute = useMemo(() => getDocumentRoute(document), [document]);
  const createdDate = useMemo(() => formatDate(document.createdAt), [document.createdAt]);
  const contentPreview = useMemo(() => getContentPreview(document.content), [document.content]);

  const cardContent = (
    <>
      {selectionMode && (
        <div
          className="absolute left-4 top-4 z-10"
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
          />
        </div>
      )}

      <div className={`flex h-full flex-col ${selectionMode ? "ml-6" : ""}`}>
        <div className="mb-4 flex w-full flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:flex-initial">
            <span className="shrink-0 text-xl sm:text-2xl">{typeIcon}</span>
            <Badge
              className={`${typeColor} shrink-0 whitespace-nowrap px-2 py-1 text-xs font-medium`}
            >
              {typeLabel}
            </Badge>
            {document.sharedResourceId && (
              <Badge className="shrink-0 whitespace-nowrap border border-teal-500/30 bg-teal-500/15 px-2 py-1 text-xs font-medium text-teal-700 dark:text-teal-400">
                <Users className="mr-1 h-3 w-3" />
                Comunidade
              </Badge>
            )}
          </div>
        </div>

        <h3 className="mb-3 line-clamp-2 text-lg font-semibold leading-tight text-foreground">
          {document.title}
        </h3>

        <p className="mb-4 flex-grow line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {contentPreview}
        </p>

        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="mb-4 space-y-2">
            {typeof document.metadata.subject === "string" &&
              document.metadata.subject && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <FileText className="mr-2 h-3 w-3 shrink-0" />
                  <span className="shrink-0 font-medium">Disciplina:</span>
                  <span className="ml-1 truncate">{document.metadata.subject}</span>
                </div>
              )}
            {typeof document.metadata.grade === "string" &&
              document.metadata.grade && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <User className="mr-2 h-3 w-3 shrink-0" />
                  <span className="shrink-0 font-medium">Ano:</span>
                  <span className="ml-1 truncate">{document.metadata.grade}</span>
                </div>
              )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="truncate text-xs text-muted-foreground">
            Criado em {createdDate}
          </p>
          {!selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="action-button h-auto w-auto shrink-0 p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );

  const cardClassName = `relative flex h-full w-full flex-col border border-border p-4 transition-all duration-200 sm:p-6 ${
    selectionMode
      ? "cursor-default"
      : "cursor-pointer hover:border-primary/20 hover:shadow-lg"
  } ${isSelected ? "border-primary bg-primary/5" : ""}`;

  if (selectionMode) {
    return <Card className={cardClassName}>{cardContent}</Card>;
  }

  return (
    <Link href={documentRoute} className="block h-full">
      <Card className={cardClassName}>{cardContent}</Card>
    </Link>
  );
}

export const DocumentCard = memo(DocumentCardComponent);
