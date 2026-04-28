/**
 * Resource Card Component
 * Displays shared resource with metadata and social proof for Community Library
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GRADE_OPTIONS,
  SUBJECT_OPTIONS,
  type SharedResource,
} from "@/services/api/community.service";
import { BookOpen, Eye, RotateCcw, TrendingUp, Users } from "lucide-react";

interface ResourceCardProps {
  resource: SharedResource;
  onReuse?: (resourceId: string) => void;
  onPreview?: (resourceId: string) => void;
  isReusing?: boolean;
  isAlreadyReused?: boolean;
  className?: string;
}

/** Map backend English value → Portuguese display label */
const subjectLabelMap = new Map(SUBJECT_OPTIONS.map((s) => [s.value, s.label]));
function getSubjectLabel(value: string): string {
  return subjectLabelMap.get(value) ?? value;
}

/** Map grade id → display label (e.g. "2" → "2º ano") */
const gradeLabelMap = new Map(
  GRADE_OPTIONS.map((g) => [String(g.value), g.label]),
);
function getGradeLabel(value: string): string {
  return gradeLabelMap.get(value) ?? value;
}

/** Map resource type key → human readable label */
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  lessonPlan: "Plano de Aula",
  test: "Teste",
  quiz: "Quiz",
  worksheet: "Ficha de Trabalho",
  presentation: "Apresentação",
  activity: "Atividade",
};
function getResourceTypeLabel(value: string): string {
  return RESOURCE_TYPE_LABELS[value] ?? value;
}

/** Deterministic color per resource type for the accent strip */
const TYPE_COLORS: Record<string, string> = {
  lessonPlan: "from-indigo-500 to-violet-500",
  test: "from-rose-500 to-pink-500",
  quiz: "from-amber-500 to-orange-500",
  worksheet: "from-teal-500 to-emerald-500",
  default: "from-blue-500 to-cyan-500",
};
function getTypeGradient(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.default;
}

export function ResourceCard({
  resource,
  onReuse,
  onPreview,
  isReusing = false,
  isAlreadyReused = false,
  className = "",
}: ResourceCardProps) {
  const subjectLabel = getSubjectLabel(resource.subject);
  const gradeLabel = getGradeLabel(resource.grade);
  const typeLabel = getResourceTypeLabel(resource.resourceType);
  const gradient = getTypeGradient(resource.resourceType);

  return (
    <Card
      className={`flex flex-col h-full overflow-hidden border border-border transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 hover:border-primary/30 group ${className}`}
    >
      {/* Accent strip + type badge */}
      <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Type pill */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
              <BookOpen className="w-3 h-3" />
              {typeLabel}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[15px] text-foreground leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {resource.title}
        </h3>

        {/* Description */}
        {resource.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed flex-grow">
            {resource.description}
          </p>
        )}

        {/* Curriculum tags */}
        <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/8 dark:bg-primary/15 text-primary border border-primary/15 dark:border-primary/25">
            {gradeLabel}
          </span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border truncate max-w-[140px]">
            {subjectLabel}
          </span>
        </div>

        {/* Footer: contributor + reuse count */}
        <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5 truncate">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span className="truncate font-medium text-foreground">
              {resource.contributorName}
            </span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-2 font-medium text-foreground">
            <TrendingUp className="w-3 h-3 text-primary" />
            {resource.reuseCount}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview?.(resource.id)}
            className="flex-1 h-8 text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Pré-visualizar
          </Button>
          <Button
            onClick={() => onReuse?.(resource.id)}
            disabled={isReusing || isAlreadyReused}
            size="sm"
            variant={isAlreadyReused ? "secondary" : "default"}
            className="flex-1 h-8 text-xs"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 mr-1.5 ${isReusing ? "animate-spin" : ""}`}
            />
            {isAlreadyReused ? "Guardado" : isReusing ? "A guardar..." : "Usar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
