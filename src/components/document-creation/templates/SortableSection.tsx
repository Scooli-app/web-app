"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/shared/utils/utils";
import { GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

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
        "flex gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-[#E4E4E7] transition-all",
        isDragging && "shadow-lg border-[#6753FF] opacity-90 z-50"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 cursor-grab active:cursor-grabbing",
          "text-[#6C6F80] hover:text-[#6753FF] hover:bg-[#EEF0FF] transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#6753FF]"
        )}
        {...attributes}
        {...listeners}
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="flex-1 space-y-2 sm:space-y-3">
        <Input
          value={section.title}
          onChange={(e) => onUpdate(section.id, "title", e.target.value)}
          placeholder="Título da secção"
          className="h-10 px-3 text-sm font-medium bg-[#F4F5F8] border-[#C7C9D9] rounded-lg placeholder:text-[#6C6F80] focus:border-[#6753FF] focus:ring-[#6753FF]/20"
          aria-label="Título da secção"
        />
        <textarea
          value={section.description}
          onChange={(e) => onUpdate(section.id, "description", e.target.value)}
          placeholder="Descrição do que esta secção deve conter..."
          rows={2}
          className="w-full px-3 py-2 text-sm bg-[#F4F5F8] border border-[#C7C9D9] rounded-lg placeholder:text-[#6C6F80] resize-none focus:outline-none focus:border-[#6753FF] focus:ring-2 focus:ring-[#6753FF]/20 transition-all"
          aria-label="Descrição da secção"
        />
      </div>

      <button
        type="button"
        onClick={() => onDelete(section.id)}
        disabled={!canDelete}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-red-500",
          canDelete
            ? "text-[#6C6F80] hover:text-red-500 hover:bg-red-50"
            : "text-[#C7C9D9] cursor-not-allowed"
        )}
        aria-label="Eliminar secção"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

