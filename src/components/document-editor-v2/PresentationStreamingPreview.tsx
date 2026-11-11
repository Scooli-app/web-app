"use client";

/**
 * The presentation while it is generated: each slide appears as soon as the model has written it, rendered
 * read-only with the deck's theme, then the pictures fill in one by one. The screen follows along (the newest slide,
 * then the next picture to come) until the teacher scrolls away. The editor opens once generation is done.
 */

import { useFollowGeneration, PENDING_ATTRIBUTE } from "@/hooks/useFollowGeneration";
import type { GenerationPhase, ImageProgress, PartialDocument } from "@/hooks/useGenerationProgress";
import { ArrowDown, Loader2, LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef } from "react";
import { CanvasSlideView, type PendingImage } from "./CanvasSlideView";
import { partialPresentationToCanvas, presentationFollowTarget, slideHasPendingImage } from "./streaming-preview";

export function PresentationStreamingPreview({
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
  const t = useTranslations("blocks.generationProgress");
  const tBlocks = useTranslations("blocks");
  const canvas = useMemo(() => partialPresentationToCanvas(partial), [partial]);
  const slides = canvas?.slides ?? [];
  const writing = phase === "preparing" || phase === "generating";
  const images = imageProgress && imageProgress.total > 0 ? imageProgress : null;
  const imagesRunning = !writing && !!images && images.completed < images.total;

  const rootRef = useRef<HTMLDivElement>(null);
  const target = presentationFollowTarget(phase, imageProgress);
  const { following, resume } = useFollowGeneration(
    rootRef,
    target,
    `${slides.length}:${images?.completed ?? 0}:${phase}`,
  );

  const pendingImage: PendingImage = imagesRunning
    ? { label: tBlocks("imageGenerating"), active: true }
    : { label: t("imageQueued"), active: false };

  const status = writing
    ? t("slidesWritten", { count: slides.length })
    : images && images.completed < images.total
      ? t("imagesStatus", { completed: images.completed, total: images.total })
      : t("finishing");

  return (
    // Sized like the editor it stands in for: the page locks <html> scrolling, so this box scrolls itself.
    <div ref={rootRef} className="flex w-full min-h-0 flex-1 flex-col overflow-y-auto bg-muted/30" aria-busy>
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{t("title")}</p>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {status} · {t("previewHint")}
            </p>
          </div>
        </div>
        {images ? (
          <div
            className="mx-auto mt-2 h-1 max-w-4xl overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label={t("imagesLabel")}
            aria-valuemin={0}
            aria-valuemax={images.total}
            aria-valuenow={images.completed}
          >
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(images.completed / Math.max(1, images.total)) * 100}%` }}
            />
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="mx-auto mt-3 max-w-4xl rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
      </div>

      <ol className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
        {slides.map((slide, i) => (
          <li
            key={slide.id}
            {...(imagesRunning && slideHasPendingImage(slide) ? { [PENDING_ATTRIBUTE]: "" } : {})}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <CanvasSlideView slide={slide} pendingImage={pendingImage} />
            <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              {t("slideNumber", { number: i + 1 })}
            </p>
          </li>
        ))}
        {writing ? (
          // Short, so the newest slide stays in full view above it while the screen follows.
          <li className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span>{t("writingSlide", { number: slides.length + 1 })}</span>
            <span className="ml-auto hidden h-2 w-24 animate-pulse rounded-full bg-muted sm:block" aria-hidden />
          </li>
        ) : null}
      </ol>

      {target !== null && !following ? (
        <div className="pointer-events-none sticky bottom-4 z-20 mt-auto flex justify-center pb-1">
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
