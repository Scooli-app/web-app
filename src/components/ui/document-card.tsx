"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Routes, type Document } from "@/shared/types";
import { Clock, FileText, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./button";

interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onSelect?: (documentId: string, selected: boolean) => void;
  onDelete?: (documentId: string) => void;
  selectionMode?: boolean;
}

const getDocumentTypeLabel = (type: string) => {
  const labels: Record<Document["documentType"], string> = {
    lessonPlan: "Plano de Aula",
    assay: "Teste",
    quiz: "Quiz",
    presentation: "Apresentação",
  };
  return labels[type as keyof typeof labels] || type;
};

const getDocumentTypeColor = (type: string) => {
  const colors = {
    lessonPlan: "bg-[#6753FF] text-white",
    assay: "bg-[#FF6B35] text-white",
    quiz: "bg-[#FF8C42] text-white",
    presentation: "bg-[#FF4F4F] text-white",
  };
  return colors[type as keyof typeof colors] || "bg-[#C7C9D9] text-[#0B0D17]";
};

const getDocumentIcon = (type: string) => {
  const icons = {
    lessonPlan: "📄",
    assay: "📝",
    quiz: "❓",
    presentation: "📊",
  };
  return icons[type as keyof typeof icons] || "📄";
};

export function DocumentCard({
  document,
  isSelected = false,
  onSelect,
  onDelete,
  selectionMode = false,
}: DocumentCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      if ((e.target as HTMLElement).closest(".action-button")) {
        return;
      }
      onSelect?.(document.id, !isSelected);
      return;
    }
    if ((e.target as HTMLElement).closest(".action-button")) {
      return;
    }
    if (document.documentType === "lessonPlan") {
      router.push(`${Routes.LESSON_PLAN}/${document.id}`);
    } else if (document.documentType === "presentation") {
      router.push(`${Routes.PRESENTATION}/${document.id}`);
    } else if (document.documentType === "assay") {
      router.push(`${Routes.ASSAYS}/${document.id}`);
    } else if (document.documentType === "quiz") {
      router.push(`${Routes.QUIZ}/${document.id}`);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(document.id, e.target.checked);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (window.confirm("Tem a certeza de que quer eliminar este documento?")) {
      setIsDeleting(true);
      try {
        await onDelete?.(document.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getContentPreview = (content: string) => {
    if (!content) {
      return "Sem conteúdo disponível";
    }

    // Remove HTML tags and markdown formatting
    let plainText = content
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/#{1,6}\s+/g, "") // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italic
      .replace(/`(.*?)`/g, "$1") // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links, keep text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
      .replace(/\n{3,}/g, "\n\n") // Normalize line breaks
      .replace(/^\s+|\s+$/g, ""); // Trim whitespace

    // Limit to 120 characters for better card layout
    if (plainText.length > 120) {
      plainText = `${plainText.substring(0, 120).trim()}...`;
    }

    return plainText;
  };

  return (
    <Card
      className={`p-6 transition-all duration-200 border border-[#E4E4E7] relative flex flex-col h-full w-full ${
        selectionMode
          ? "cursor-default"
          : "cursor-pointer hover:shadow-lg hover:border-[#6753FF]/20"
      } ${isSelected ? "border-[#6753FF] bg-[#6753FF]/5" : ""}`}
      onClick={handleCardClick}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute top-4 left-4 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="w-4 h-4 text-[#6753FF] bg-white border-gray-300 rounded focus:ring-[#6753FF] focus:ring-2"
          />
        </div>
      )}

      <div className={`flex flex-col h-full ${selectionMode ? "ml-6" : ""}`}>
        {/* Header with icon and type */}
        <div className="flex items-start justify-between mb-4 w-full gap-2 min-h-[32px]">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="text-xl sm:text-2xl flex-shrink-0">
              {getDocumentIcon(document.documentType)}
            </span>
            <Badge
              className={`${getDocumentTypeColor(
                document.documentType
              )} px-2 py-1 text-xs font-medium whitespace-nowrap`}
            >
              {getDocumentTypeLabel(document.documentType)}
            </Badge>
          </div>
          <div className="flex items-center text-xs text-[#6C6F80] flex-shrink-0">
            <Clock className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">
              {formatDate(document.updatedAt)}
            </span>
            <span className="sm:hidden">
              {new Date(document.updatedAt).toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[#0B0D17] line-clamp-2 leading-tight mb-3">
          {document.title}
        </h3>

        {/* Content preview */}
        <p className="text-sm text-[#6C6F80] line-clamp-3 leading-relaxed mb-4 flex-grow">
          {getContentPreview(document.content)}
        </p>

        {/* Metadata */}
        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="space-y-2 mb-4">
            {typeof document.metadata.subject === "string" &&
              document.metadata.subject && (
                <div className="flex items-center text-xs text-[#6C6F80]">
                  <FileText className="w-3 h-3 mr-2" />
                  <span className="font-medium">Disciplina:</span>
                  <span className="ml-1">{document.metadata.subject}</span>
                </div>
              )}
            {typeof document.metadata.grade === "string" &&
              document.metadata.grade && (
                <div className="flex items-center text-xs text-[#6C6F80]">
                  <User className="w-3 h-3 mr-2" />
                  <span className="font-medium">Ano:</span>
                  <span className="ml-1">{document.metadata.grade}</span>
                </div>
              )}
          </div>
        )}

        {/* Footer with creation date and delete button - always at bottom */}
        <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between mt-auto">
          <p className="text-xs text-[#6C6F80]">
            Criado em {formatDate(document.createdAt)}
          </p>
          {!selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="action-button p-1 h-auto w-auto text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
