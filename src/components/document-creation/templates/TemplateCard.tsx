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
        "hover:shadow-md focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        isSelected
          ? "bg-accent border-primary"
          : "bg-card border-border hover:border-muted-foreground/30"
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
              "text-muted-foreground hover:text-primary hover:bg-background",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
            aria-label="Editar modelo"
          >
            <Pencil className="w-4 h-4" />
          </div>
        )}
        {isSelected && (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
            isSelected ? "bg-background" : "bg-muted"
          )}
        >
          <FileText
            className={cn(
              "w-5 h-5",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3
              className={cn(
                "font-semibold text-sm",
                isSelected ? "text-foreground" : "text-secondary-foreground"
              )}
            >
              {template.name}
            </h3>
            {template.isSystem ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
                <Sparkles className="w-2.5 h-2.5" />
                Scooli
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                Personalizado
              </span>
            )}
            {template.isDefault && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-success text-white">
                Padrão
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-xs line-clamp-2 mb-2",
              isSelected ? "text-secondary-foreground" : "text-muted-foreground"
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
                    ? "bg-background text-primary"
                    : "bg-muted text-muted-foreground"
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
                    ? "bg-background text-primary"
                    : "bg-muted text-muted-foreground"
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
