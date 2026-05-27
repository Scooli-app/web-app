"use client";

import type { LessonSlot } from "@/shared/types/timetable";

interface SlotCardProps {
  lesson: LessonSlot;
  onGenerate?: (lessonId: string) => void;
  onSkip?: (lessonId: string) => void;
  onViewDocument?: (documentId: string) => void;
  isGenerating?: boolean;
  linkedDocumentId?: string;
  color?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  generating: "A gerar…",
  generated: "Gerado",
  skipped: "Ignorada",
  error: "Erro",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  generating:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  generated:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  skipped:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function SlotCard({
  lesson,
  onGenerate,
  onSkip,
  onViewDocument,
  isGenerating = false,
  linkedDocumentId,
  color,
}: SlotCardProps) {
  const statusLabel = STATUS_LABELS[lesson.status] ?? lesson.status;
  const statusColor =
    STATUS_COLORS[lesson.status] ?? "bg-muted text-muted-foreground";

  const borderColor = color ? "border-l-4" : "";
  const borderStyle = color ? { borderLeftColor: color } : {};

  return (
    <div
      className={`bg-card text-card-foreground rounded-lg border shadow-sm p-3 flex flex-col gap-2 ${borderColor}`}
      style={borderStyle}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Aula {lesson.sequenceNumber} · {lesson.subject}
          </p>
          <p className="text-sm font-semibold truncate">
            {lesson.topicTitle ?? "Tópico por definir"}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Time info */}
      {lesson.slotStartTime && (
        <p className="text-xs text-muted-foreground">
          {lesson.slotStartTime} · {lesson.durationMinutes} min
        </p>
      )}

      {/* Error */}
      {lesson.status === "error" && lesson.errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 truncate">
          {lesson.errorMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {lesson.status === "generated" && linkedDocumentId ? (
          <button
            type="button"
            onClick={() => onViewDocument?.(linkedDocumentId)}
            className="flex-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-2.5 py-1.5 font-medium transition-colors"
          >
            Ver plano
          </button>
        ) : (
          <button
            type="button"
            disabled={
              isGenerating ||
              lesson.status === "skipped" ||
              lesson.status === "generating"
            }
            onClick={() => onGenerate?.(lesson.id)}
            className="flex-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1.5 font-medium transition-colors"
          >
            {lesson.status === "generating"
              ? "A gerar…"
              : lesson.status === "error"
                ? "Tentar novamente"
                : "Gerar plano"}
          </button>
        )}

        {lesson.status !== "skipped" && lesson.status !== "generating" && (
          <button
            type="button"
            onClick={() => onSkip?.(lesson.id)}
            className="text-xs rounded-md border border-border bg-background hover:bg-muted px-2.5 py-1.5 font-medium transition-colors"
          >
            Ignorar
          </button>
        )}
      </div>
    </div>
  );
}
