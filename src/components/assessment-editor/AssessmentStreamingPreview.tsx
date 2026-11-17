"use client";

/**
 * A test, quiz or worksheet while it is generated: each exercise appears as soon as the model has written it, as the
 * student sees it, and the pictures fill in one by one. The screen follows along (the newest exercise, then the next
 * picture to come) until the teacher scrolls away. The answers stay hidden until the answer-key check has run; the
 * editor opens once generation (check and pictures included) is done.
 */

import { useFollowGeneration, type FollowTarget } from "@/hooks/useFollowGeneration";
import type { GenerationPhase, ImageOutcomes, ImageProgress, PartialDocument } from "@/hooks/useGenerationProgress";
import { ArrowDown, Loader2, LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef } from "react";
import { AssessmentPreview } from "./AssessmentPreview";
import type { PendingImages } from "./context";
import { PagesSkeleton } from "./PagesSkeleton";

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

/** The pictures are being made and not all are done. */
function imagesRunning(imageProgress: ImageProgress | null): imageProgress is ImageProgress {
  return !!imageProgress && imageProgress.total > 0 && imageProgress.completed < imageProgress.total;
}

/** What the screen follows: the newest exercise while writing, then the next picture to come, then nothing. */
export function assessmentFollowTarget(phase: GenerationPhase, imageProgress: ImageProgress | null): FollowTarget {
  if (phase === "preparing" || phase === "generating") return "end";
  return imagesRunning(imageProgress) ? "pending" : null;
}

export function AssessmentStreamingPreview({
  partial,
  phase,
  imageProgress,
  imageOutcomes = {},
  attempt = 1,
  error,
}: {
  /** Null until the first exercise is written (or after a retry): empty pages stand in. */
  partial: PartialDocument | null;
  phase: GenerationPhase;
  imageProgress: ImageProgress | null;
  imageOutcomes?: ImageOutcomes;
  attempt?: number;
  error: string | null;
}) {
  const t = useTranslations("assessmentEditor.streaming");
  const content = useMemo(() => (partial ? JSON.stringify(partial) : null), [partial]);
  const count = useMemo(() => streamedExerciseCount(partial), [partial]);
  const writing = phase === "preparing" || phase === "generating";
  const running = !writing && imagesRunning(imageProgress);
  const pendingImages = useMemo<PendingImages>(() => ({ active: running, outcomes: imageOutcomes }), [running, imageOutcomes]);

  const rootRef = useRef<HTMLDivElement>(null);
  const target = assessmentFollowTarget(phase, imageProgress);
  const { following, resume } = useFollowGeneration(
    rootRef,
    partial ? target : null,
    `${content?.length ?? 0}:${imageProgress?.completed ?? 0}:${phase}`,
  );

  let title: string;
  let subtitle: string;
  if (writing) {
    title = t("writingTitle");
    subtitle = attempt > 1 && count === 0 ? t("retrying") : partial ? t("writingSubtitle", { count }) : t("startingSubtitle");
  } else if (running) {
    // The answer-key check may still be running alongside: the pictures are what the teacher can see change.
    title = t("imagesTitle");
    subtitle = t("imagesSubtitle", { completed: imageProgress.completed, total: imageProgress.total });
  } else {
    title = t("reviewingTitle");
    subtitle = t("reviewingSubtitle");
  }

  return (
    <div ref={rootRef} className="mx-auto flex max-w-[794px] flex-col gap-6" aria-busy>
      {/* Sticks flush to the top of the scrolling box (whose padding is py-6, py-3 on phones): nothing shows above it. */}
      <div className="sticky -top-6 z-20 overflow-hidden rounded-lg border border-border bg-background text-sm shadow-sm max-md:-top-3 max-md:rounded-none max-md:border-x-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <div aria-live="polite">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {imageProgress && imageProgress.total > 0 && !writing ? (
          <div
            className="h-1 w-full bg-border"
            role="progressbar"
            aria-label={t("imagesTitle")}
            aria-valuemin={0}
            aria-valuemax={imageProgress.total}
            aria-valuenow={imageProgress.completed}
          >
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(imageProgress.completed / Math.max(1, imageProgress.total)) * 100}%` }}
            />
          </div>
        ) : null}
      </div>
      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {content ? (
        <AssessmentPreview
          content={content}
          studentView
          pendingImages={pendingImages}
          animateItems
          className="px-6 pb-14 pt-8 shadow-[0_2px_10px_rgba(0,0,0,0.06)] md:px-12"
        />
      ) : (
        <PagesSkeleton />
      )}
      {writing && content ? (
        // Short, so the newest exercise stays in full view above it while the screen follows.
        <div className="flex items-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white/60 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          {t("writingNext")}
        </div>
      ) : null}
      {target !== null && partial && !following ? (
        <div className="pointer-events-none sticky bottom-4 z-20 flex justify-center">
          <button
            type="button"
            onClick={resume}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {target === "end" ? <ArrowDown className="h-3.5 w-3.5" aria-hidden /> : <LocateFixed className="h-3.5 w-3.5" aria-hidden />}
            {t("follow")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
