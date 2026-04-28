"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/shared/utils/utils";
import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface SectionItem {
  id: string;
  title: string;
  description: string;
}

interface SortableSectionProps {
  section: SectionItem;
  onUpdate: (id: string, field: "title" | "description", value: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

export function SortableSection({
  section,
  onUpdate,
  onDelete,
  canDelete,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border bg-card p-3 transition-all sm:p-4",
        isDragging && "z-50 border-primary opacity-90 shadow-lg",
      )}
    >
      <div className="mb-2 flex items-center justify-between sm:hidden">
        <button
          type="button"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors",
            "cursor-grab active:cursor-grabbing hover:bg-accent hover:text-primary",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          )}
          {...attributes}
          {...listeners}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(section.id)}
          disabled={!canDelete}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            "focus-visible:ring-destructive/50 focus-visible:ring-[3px]",
            canDelete
              ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              : "cursor-not-allowed text-muted-foreground/30",
          )}
          aria-label="Eliminar seccao"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 sm:gap-3">
        <button
          type="button"
          className={cn(
            "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors sm:flex",
            "cursor-grab active:cursor-grabbing hover:bg-accent hover:text-primary",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          )}
          {...attributes}
          {...listeners}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 space-y-2 sm:space-y-3">
          <Input
            value={section.title}
            onChange={(e) => onUpdate(section.id, "title", e.target.value)}
            placeholder="Titulo da seccao"
            className="h-10 rounded-lg border-input bg-input px-3 text-sm font-medium placeholder:text-muted-foreground"
            aria-label="Titulo da seccao"
          />
          <Textarea
            value={section.description}
            onChange={(e) => onUpdate(section.id, "description", e.target.value)}
            placeholder="Instrucoes para a IA: o que incluir nesta seccao..."
            rows={2}
            className="min-h-0 rounded-lg border-input bg-input px-3 py-2 text-sm placeholder:text-muted-foreground"
            aria-label="Instrucoes para a seccao"
          />
        </div>

        <button
          type="button"
          onClick={() => onDelete(section.id)}
          disabled={!canDelete}
          className={cn(
            "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors sm:flex",
            "focus-visible:ring-destructive/50 focus-visible:ring-[3px]",
            canDelete
              ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              : "cursor-not-allowed text-muted-foreground/30",
          )}
          aria-label="Eliminar seccao"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
