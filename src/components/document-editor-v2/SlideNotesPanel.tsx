"use client";

/**
 * Collapsible teacher-notes panel shown under the slide canvas.
 *
 * Notes are teacher-only (never drawn on the slide) and are exported as PPTX
 * speaker notes. The open/closed state is remembered per browser.
 */
import { ChevronDown, ChevronUp, NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/shared/utils/utils";

const OPEN_STORAGE_KEY = "scooli.editor.notesPanelOpen";
/** Matches the SlideBlock.notes limit in blocks.ts. */
const NOTES_MAX_LENGTH = 2000;

interface SlideNotesPanelProps {
  notes: string;
  /** Called once when the teacher starts an editing session (focus), for undo history. */
  onEditStart: () => void;
  onChange: (notes: string) => void;
}

export function SlideNotesPanel({ notes, onEditStart, onChange }: SlideNotesPanelProps) {
  const t = useTranslations("editor.blockEditor");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(OPEN_STORAGE_KEY);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      // storage unavailable: keep the default
    }
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(OPEN_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <section
      aria-label={t("notesTitle")}
      className="w-full shrink-0 border-t border-border bg-background"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <NotebookPen className="h-3.5 w-3.5" />
        <span>{t("notesTitle")}</span>
        {!open && notes.trim() && (
          <span className="truncate font-normal text-muted-foreground/80">· {notes.trim()}</span>
        )}
        <span className="ml-auto">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </span>
      </button>
      <div className={cn("px-4 pb-3", !open && "hidden")}>
        <textarea
          value={notes}
          onFocus={onEditStart}
          onChange={(e) => onChange(e.target.value)}
          maxLength={NOTES_MAX_LENGTH}
          rows={4}
          placeholder={t("notesPlaceholder")}
          aria-label={t("notesTitle")}
          className="block w-full resize-y rounded-md border border-border bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </section>
  );
}
