"use client";

/**
 * The presentation while it is generated: each slide appears as soon as the model has written it, rendered
 * read-only with the deck's theme, then the pictures fill in. The editor opens once generation is done.
 */

import type { GenerationPhase, ImageProgress, PartialDocument } from "@/hooks/useGenerationProgress";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { CanvasSlideView } from "./CanvasSlideView";
import { partialPresentationToCanvas } from "./streaming-preview";

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
  const canvas = useMemo(() => partialPresentationToCanvas(partial), [partial]);
  const slides = canvas?.slides ?? [];
  const writing = phase === "preparing" || phase === "generating";
  const images = imageProgress && imageProgress.total > 0 ? imageProgress : null;

  const status = writing
    ? t("slidesWritten", { count: slides.length })
    : images
      ? t("imagesStatus", { completed: images.completed, total: images.total })
      : t("finishing");

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-muted/30" aria-busy>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
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
          <div className="mx-auto mt-2 h-1 max-w-4xl overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-primary transition-all duration-300"
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
          <li key={slide.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <CanvasSlideView slide={slide} pendingImages />
            <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              {t("slideNumber", { number: i + 1 })}
            </p>
          </li>
        ))}
        {writing ? (
          <li className="flex aspect-video w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/60 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("writingNextSlide")}
          </li>
        ) : null}
      </ol>
    </div>
  );
}
