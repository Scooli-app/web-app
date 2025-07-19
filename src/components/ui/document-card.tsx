"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Document } from "@/lib/types/documents";
import { Clock, FileText, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface DocumentCardProps {
  document: Document;
}

const getDocumentTypeLabel = (type: string) => {
  const labels = {
    lesson_plan: "Plano de Aula",
    assessment: "Avaliação",
    activity: "Atividade",
    curriculum_analysis: "Análise Curricular",
  };
  return labels[type as keyof typeof labels] || type;
};

const getDocumentTypeColor = (type: string) => {
  const colors = {
    lesson_plan: "bg-[#6753FF] text-white",
    assessment: "bg-[#1DB67D] text-white",
    activity: "bg-[#FFC857] text-black",
    curriculum_analysis: "bg-[#FF4F4F] text-white",
  };
  return colors[type as keyof typeof colors] || "bg-[#C7C9D9] text-[#0B0D17]";
};

const getDocumentIcon = (type: string) => {
  const icons = {
    lesson_plan: "📄",
    assessment: "📝",
    activity: "🎯",
    curriculum_analysis: "📊",
  };
  return icons[type as keyof typeof icons] || "📄";
};

export function DocumentCard({ document }: DocumentCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    if (document.document_type === "lesson_plan") {
      router.push(`/lesson-plan/${document.id}`);
    }
    // Add routing for other document types as they become available
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
    const plainText = content.replace(/<[^>]*>/g, "");
    return plainText.length > 150 ? `${plainText.substring(0, 150)}...` : plainText;
  };

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-[#E4E4E7] hover:border-[#6753FF]/20"
      onClick={handleCardClick}
    >
      <div className="space-y-4">
        {/* Header with icon and type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getDocumentIcon(document.document_type)}</span>
            <Badge className={`${getDocumentTypeColor(document.document_type)} px-3 py-1 text-xs font-medium`}>
              {getDocumentTypeLabel(document.document_type)}
            </Badge>
          </div>
          <div className="flex items-center text-xs text-[#6C6F80]">
            <Clock className="w-3 h-3 mr-1" />
            {formatDate(document.updated_at)}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[#0B0D17] line-clamp-2 leading-tight">
          {document.title}
        </h3>

        {/* Content preview */}
        <p className="text-sm text-[#6C6F80] line-clamp-3 leading-relaxed">
          {getContentPreview(document.content)}
        </p>

        {/* Metadata */}
        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="space-y-2">
            {typeof document.metadata.subject === "string" && document.metadata.subject && (
              <div className="flex items-center text-xs text-[#6C6F80]">
                <FileText className="w-3 h-3 mr-2" />
                <span className="font-medium">Disciplina:</span>
                <span className="ml-1">{document.metadata.subject}</span>
              </div>
            )}
            {typeof document.metadata.grade === "string" && document.metadata.grade && (
              <div className="flex items-center text-xs text-[#6C6F80]">
                <User className="w-3 h-3 mr-2" />
                <span className="font-medium">Ano:</span>
                <span className="ml-1">{document.metadata.grade}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer with creation date */}
        <div className="pt-2 border-t border-[#E4E4E7]">
          <p className="text-xs text-[#6C6F80]">
            Criado em {formatDate(document.created_at)}
          </p>
        </div>
      </div>
    </Card>
  );
} 