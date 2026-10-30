"use client";

import { cn } from "@/shared/utils/utils";
import { CheckCircle2, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, type KeyboardEvent } from "react";
import type { SheetTab } from "./sheetTab";

const TABS: { id: SheetTab; icon: typeof FileText }[] = [
  { id: "student", icon: FileText },
  { id: "answers", icon: CheckCircle2 },
];

/**
 * Two tabs on top of the sheet, like two sheets in a folder: what the student gets, and the same sheet with the
 * solutions. They match the two exported files. Both can be edited; only what the sheet shows changes.
 */
export function SheetTabs({ value, onChange, pendingChecks }: { value: SheetTab; onChange: (tab: SheetTab) => void; pendingChecks: number }) {
  const t = useTranslations("assessmentEditor.tabs");
  const refs = useRef<Record<SheetTab, HTMLButtonElement | null>>({ student: null, answers: null });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: SheetTab = value === "student" ? "answers" : "student";
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={t("label")} className="relative z-[2] mx-auto -mb-px flex w-full max-w-[794px] gap-1 px-2 font-sans" onClick={(e) => e.stopPropagation()}>
      {TABS.map(({ id, icon: Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            ref={(el) => { refs.current[id] = el; }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={onKeyDown}
            className={cn(
              "flex min-h-11 min-w-0 items-center gap-2 rounded-t-lg border px-4 py-2 text-left transition-colors",
              selected
                ? "border-neutral-200 border-b-white bg-white text-neutral-900 dark:border-neutral-700 dark:border-b-white"
                : "border-transparent bg-neutral-200/70 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", selected && (id === "answers" ? "text-emerald-600" : "text-primary"))} aria-hidden />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {t(`${id}.title`)}
                {id === "answers" && pendingChecks > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-px text-[11px] font-semibold text-amber-800">
                    {t("toCheck", { count: pendingChecks })}
                  </span>
                )}
              </span>
              <span className={cn("text-xs max-sm:hidden", selected ? "text-neutral-500" : "text-neutral-500 dark:text-neutral-400")}>{t(`${id}.hint`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
