"use client";

import { useMotionSafe } from "@/lib/motion/useMotionSafe";
import { cn } from "@/shared/utils/utils";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

export interface WeekRow {
  id: string;
  slotDate: string;
  title: string;
  status: "pending" | "generating" | "ready" | "failed";
}

interface WeekLessonRowProps {
  row: WeekRow;
  /** 1-based position, used when the lesson has no topic title. */
  position: number;
  locale: string;
}

/** One lesson of the first week: pending, generating (shimmer), ready (check pop) or failed. */
export function WeekLessonRow({ row, position, locale }: WeekLessonRowProps) {
  const t = useTranslations("onboardingV2.week");
  const { pop } = useMotionSafe();

  const date = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${row.slotDate}T00:00:00`));

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors",
        row.status === "generating" && "animate-pulse border-primary/40 bg-primary/5 motion-reduce:animate-none",
        row.status === "ready" && "border-primary/30",
        row.status === "failed" && "border-destructive/40",
        row.status === "pending" && "border-border",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium capitalize text-muted-foreground">{date}</p>
        <p className="truncate text-sm font-medium text-foreground">
          {row.title || t("lessonFallback", { number: position })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground" role="status">
        <span>{t(row.status)}</span>
        {row.status === "generating" && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        )}
        {row.status === "ready" && (
          <motion.span
            variants={pop}
            initial="initial"
            animate="animate"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          </motion.span>
        )}
        {row.status === "failed" && (
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
        )}
      </div>
    </div>
  );
}
