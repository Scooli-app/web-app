"use client";

import { cn } from "@/shared/utils/utils";
import type { AeOutcome } from "@/types/assessment";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * `undefined` = still loading, `null` = unknown id. Retired outcomes count as unavailable.
 * `onPaper`: drawn on the always-white page, so it keeps its light colours in dark mode.
 */
export function AeChip({ outcome, onRemove, onPaper }: { outcome: AeOutcome | null | undefined; onRemove?: () => void; onPaper?: boolean }) {
  const t = useTranslations("assessmentEditor.ae");
  const unavailable = outcome === null || outcome?.retired;
  const label = outcome === undefined ? t("loading") : unavailable ? t("unavailable") : `${outcome.topicLeaf}: ${outcome.text}`;

  return (
    <span
      title={outcome && !unavailable ? outcome.text : undefined}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[11px] font-medium leading-4",
        unavailable ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
        !onPaper && (unavailable
          ? "dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
          : "dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"),
        outcome === undefined && "animate-pulse",
      )}
    >
      <span className="shrink-0 font-semibold">{t("prefix")} ·</span>
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("remove")}
          className="-mr-1 shrink-0 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
