"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import { useSelector } from "react-redux";

import { Label } from "@/components/ui/label";
import { selectIsAlreadyCoveredEnabled } from "@/store/features/selectors";
import { cn } from "@/shared/utils/utils";

/** Mirrors AlreadyCoveredNotes.MAX_LENGTH on the backend, which truncates anything longer. */
const MAX_LENGTH = 2000;

interface AlreadyCoveredSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  className?: string;
}

/**
 * Lets a teacher creating a turma or a planificação mid-year say what has
 * already been taught, so the generated topics / plan pick up from there
 * instead of restarting the subject from lesson 1. Free text only: the
 * teacher knows where the class is better than a programme checklist can
 * capture. Hidden entirely while the already_covered_enabled flag is off.
 */
export function AlreadyCoveredSection({ notes, onNotesChange, className }: AlreadyCoveredSectionProps) {
  const t = useTranslations("documentCreation.alreadyCovered");
  const enabled = useSelector(selectIsAlreadyCoveredEnabled);
  const textareaId = useId();

  if (!enabled) return null;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-primary/30 bg-primary/5", className)}>
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <History className="h-4 w-4 text-primary" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{t("title")}</span>
          <span className="block text-xs text-muted-foreground">{t("subtitle")}</span>
        </span>
      </div>

      <div className="space-y-1.5 border-t border-primary/20 bg-background px-3 py-3 sm:px-4 sm:py-4">
        <Label htmlFor={textareaId} className="text-xs text-muted-foreground">
          {t("label")}
        </Label>
        <textarea
          id={textareaId}
          className="min-h-[90px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder={t("placeholder")}
          maxLength={MAX_LENGTH}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </div>
  );
}
