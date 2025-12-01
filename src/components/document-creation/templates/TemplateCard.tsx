"use client";

import type { DocumentTemplate } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { Check, FileText, Pencil, Sparkles } from "lucide-react";

interface TemplateCardProps {
  template: DocumentTemplate;
  isSelected: boolean;
  onSelect: (template: DocumentTemplate) => void;
  onEdit?: (template: DocumentTemplate) => void;
}

export function TemplateCard({
  template,
  isSelected,
  onSelect,
  onEdit,
}: TemplateCardProps) {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(template);
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={cn(
        "relative w-full p-4 rounded-xl border-2 text-left transition-all group",
        "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#6753FF] focus:ring-offset-2",
        isSelected
          ? "bg-[#EEF0FF] border-[#6753FF]"
          : "bg-white border-[#E4E4E7] hover:border-[#C7C9D9]"
      )}
      aria-pressed={isSelected}
      aria-label={`Selecionar modelo: ${template.name}`}
    >
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {!template.isSystem && onEdit && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleEditClick}
            onKeyDown={(e) => e.key === "Enter" && handleEditClick(e as unknown as React.MouseEvent)}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-lg transition-all",
              "opacity-0 group-hover:opacity-100",
              "text-[#6C6F80] hover:text-[#6753FF] hover:bg-white",
              "focus:outline-none focus:ring-2 focus:ring-[#6753FF]"
            )}
            aria-label="Editar modelo"
          >
            <Pencil className="w-4 h-4" />
          </div>
        )}
        {isSelected && (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#6753FF]">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
            isSelected ? "bg-white" : "bg-[#F4F5F8]"
          )}
        >
          <FileText
            className={cn(
              "w-5 h-5",
              isSelected ? "text-[#6753FF]" : "text-[#6C6F80]"
            )}
          />
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3
              className={cn(
                "font-semibold text-sm",
                isSelected ? "text-[#0B0D17]" : "text-[#2E2F38]"
              )}
            >
              {template.name}
            </h3>
            {template.isSystem ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-[#6753FF] to-[#8B7AFF] text-white">
                <Sparkles className="w-2.5 h-2.5" />
                Scooli
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4F5F8] text-[#6C6F80]">
                Personalizado
              </span>
            )}
            {template.isDefault && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1DB67D] text-white">
                Padrão
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-xs line-clamp-2 mb-2",
              isSelected ? "text-[#2E2F38]" : "text-[#6C6F80]"
            )}
          >
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {template.sections.slice(0, 3).map((section) => (
              <span
                key={section.id}
                className={cn(
                  "inline-flex px-2 py-0.5 rounded-md text-[10px]",
                  isSelected
                    ? "bg-white text-[#6753FF]"
                    : "bg-[#F4F5F8] text-[#6C6F80]"
                )}
              >
                {section.title}
              </span>
            ))}
            {template.sections.length > 3 && (
              <span
                className={cn(
                  "inline-flex px-2 py-0.5 rounded-md text-[10px]",
                  isSelected
                    ? "bg-white text-[#6753FF]"
                    : "bg-[#F4F5F8] text-[#6C6F80]"
                )}
              >
                +{template.sections.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

