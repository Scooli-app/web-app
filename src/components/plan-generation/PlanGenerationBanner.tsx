"use client";

import { retryPlanGeneration } from "@/components/onboarding-v2/planGenerationRunner";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/hooks";
import { selectPlanGeneration } from "@/store/planGeneration/selectors";
import { cn } from "@/shared/utils/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface PlanGenerationBannerProps {
  /** Only show for this class (calendar detail page); omit to show for any class. */
  timetableId?: string;
  className?: string;
}

/**
 * Small row telling the teacher the class plan is still being generated in the
 * background (started in onboarding). Shows the stage, and a retry on failure.
 */
export function PlanGenerationBanner({ timetableId, className }: PlanGenerationBannerProps) {
  const t = useTranslations("planGeneration");
  const gen = useAppSelector(selectPlanGeneration);

  if (gen.status === "idle" || gen.status === "done") return null;
  if (timetableId && gen.timetableId !== timetableId) return null;

  if (gen.status === "error") {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-card px-3 py-2",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            {gen.error === "topics" ? t("errorTopics") : t("errorWeek")}
          </span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={retryPlanGeneration}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  const total = gen.lessons.length;
  const done = gen.lessons.filter((l) => l.status === "ready").length;
  const stage =
    gen.status === "topics"
      ? t("stageTopics")
      : total > 0
        ? t("stageLessons", { done, total })
        : t("stageLessonsNoCount");

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      {/* Always animated, even under reduced motion: it is essential progress feedback. */}
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight text-foreground">{t("title")}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{stage}</p>
      </div>
    </div>
  );
}
