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
        "group relative w-full rounded-xl border-2 p-4 text-left transition-all",
        "hover:shadow-md focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        isSelected
          ? "border-primary bg-accent"
          : "border-border bg-card hover:border-muted-foreground/30",
      )}
      aria-pressed={isSelected}
      aria-label={`Selecionar modelo: ${template.name}`}
    >
      <div className="absolute right-3 top-3 flex items-center gap-2">
        {!template.isSystem && onEdit && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleEditClick}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleEditClick(e as unknown as React.MouseEvent)
            }
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-all",
              "opacity-100 hover:bg-background hover:text-primary sm:opacity-0 sm:group-hover:opacity-100",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            )}
            aria-label="Editar modelo"
          >
            <Pencil className="h-4 w-4" />
          </div>
        )}
        {isSelected && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isSelected ? "bg-background" : "bg-muted",
          )}
        >
          <FileText
            className={cn(
              "h-5 w-5",
              isSelected ? "text-primary" : "text-muted-foreground",
            )}
          />
        </div>
        <div className="min-w-0 flex-1 pr-10 sm:pr-12">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "text-sm font-semibold",
                isSelected ? "text-foreground" : "text-secondary-foreground",
              )}
            >
              {template.name}
            </h3>
            {template.isSystem ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/70 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                <Sparkles className="h-2.5 w-2.5" />
                Scooli
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Personalizado
              </span>
            )}
            {template.isDefault && (
              <span className="inline-flex rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white">
                Padrao
              </span>
            )}
          </div>
          <p
            className={cn(
              "mb-2 line-clamp-2 text-xs",
              isSelected ? "text-secondary-foreground" : "text-muted-foreground",
            )}
          >
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {template.sections.slice(0, 3).map((section) => (
              <span
                key={section.id}
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-[10px]",
                  isSelected
                    ? "bg-background text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {section.title}
              </span>
            ))}
            {template.sections.length > 3 && (
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-[10px]",
                  isSelected
                    ? "bg-background text-primary"
                    : "bg-muted text-muted-foreground",
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
