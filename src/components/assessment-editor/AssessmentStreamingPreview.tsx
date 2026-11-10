"use client";

/**
 * A test, quiz or worksheet while it is generated: each exercise appears as soon as the model has written it,
 * as the student sees it. The answers stay hidden until the answer-key check has run; the editor opens once
 * generation (check and pictures included) is done.
 */

import type { GenerationPhase, ImageProgress, PartialDocument } from "@/hooks/useGenerationProgress";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { AssessmentPreview } from "./AssessmentPreview";

/** How many exercises the streamed document holds (reading boxes are not counted). */
export function streamedExerciseCount(partial: PartialDocument | null): number {
  if (!partial || !Array.isArray(partial.sections)) return 0;
  let count = 0;
  for (const section of partial.sections as Array<{ items?: unknown }>) {
    if (!Array.isArray(section?.items)) continue;
    for (const item of section.items as Array<{ kind?: unknown }>) {
      if (item?.kind === "exercise") count++;
    }
  }
  return count;
}

export function AssessmentStreamingPreview({
  partial,
  phase,
  imageProgress,
  error,
}: {
  partial: PartialDocument;
  phase: GenerationPhase;
  imageProgress: ImageProgress | null;
  error: string | null;
}) {
  const t = useTranslations("assessmentEditor.streaming");
  const content = useMemo(() => JSON.stringify(partial), [partial]);
  const count = useMemo(() => streamedExerciseCount(partial), [partial]);
  const writing = phase === "preparing" || phase === "generating";
  const images = imageProgress && imageProgress.total > 0 ? imageProgress : null;

  let title: string;
  let subtitle: string;
  if (writing) {
    title = t("writingTitle");
    subtitle = t("writingSubtitle", { count });
  } else if (phase === "images" && images) {
    title = t("imagesTitle");
    subtitle = t("imagesSubtitle", { completed: images.completed, total: images.total });
  } else {
    title = t("reviewingTitle");
    subtitle = t("reviewingSubtitle");
  }

  return (
    <div className="mx-auto flex max-w-[794px] flex-col gap-6" aria-busy>
      <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm shadow-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div aria-live="polite">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <AssessmentPreview content={content} studentView className="px-6 pb-14 pt-8 shadow-[0_2px_10px_rgba(0,0,0,0.06)] md:px-12" />
      {writing ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white/60 px-6 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("writingNext")}
        </div>
      ) : null}
    </div>
  );
}
