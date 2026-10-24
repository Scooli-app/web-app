"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { cn } from "@/shared/utils/utils";
import type { AssessmentDocument, AssessmentItem } from "@/types/assessment";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PHONE_TOUCH } from "./context";
import { ExerciseEditor, ReadingEditor } from "./ExerciseEditor";
import { TotalsBar } from "./TotalsBar";

/** Phone editor for one item: a bottom sheet with up/down reorder instead of drag, and the live total in its footer. */
export function ExerciseSheet({ doc, item, number, onChange, onClose, onMove, canMoveUp, canMoveDown, onDuplicate, onDelete, canDelete }: {
  doc: AssessmentDocument;
  item: AssessmentItem;
  number: number;
  onChange: (next: AssessmentItem) => void;
  onClose: () => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const t = useTranslations("assessmentEditor");
  const keyboard = useKeyboardInset();
  const action = (label: string, onClick: () => void, icon: ReactNode, disabled = false, className?: string) => (
    <Button type="button" variant="outline" size="icon" className={cn("h-11 w-11", className)} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {icon}
    </Button>
  );
  const toolbar = (
    <div className="flex items-center gap-2">
      {action(t("item.moveUp"), () => onMove(-1), <ArrowUp className="h-4 w-4" />, !canMoveUp)}
      {action(t("item.moveDown"), () => onMove(1), <ArrowDown className="h-4 w-4" />, !canMoveDown)}
      {action(t("item.duplicate"), onDuplicate, <Copy className="h-4 w-4" />)}
      {action(canDelete ? t("item.delete") : t("item.lastItem"), onDelete, <Trash2 className="h-4 w-4" />, !canDelete, "ml-auto text-destructive hover:text-destructive")}
    </div>
  );
  const editorProps = { onClose, toolbar, autoFocus: false, className: "rounded-none border-0 bg-transparent p-0 shadow-none" };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showClose={false}
        aria-describedby={undefined}
        // Opening must not pop the keyboard; the teacher taps the field they want.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn("max-h-[90dvh] gap-0 rounded-t-2xl bg-card p-0", PHONE_TOUCH)}
        // Lifts the sheet's content above the on-screen keyboard.
        style={keyboard ? { paddingBottom: keyboard } : undefined}
      >
        <SheetTitle className="sr-only">{item.kind === "exercise" ? t("editor.title", { number }) : t("editor.readingTitle")}</SheetTitle>
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          {item.kind === "exercise" ? (
            <ExerciseEditor exercise={item} number={number} onChange={onChange} {...editorProps} />
          ) : (
            <ReadingEditor item={item} onChange={onChange} {...editorProps} />
          )}
        </div>
        <div className="shrink-0 border-t border-border px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          <TotalsBar doc={doc} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
