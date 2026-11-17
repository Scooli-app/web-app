import type { FollowTarget } from "@/hooks/useFollowGeneration";
import type { GenerationPhase, ImageProgress } from "@/hooks/useGenerationProgress";
import { slideBlockSchema, type PresentationDocument, type SlideBlock } from "@/shared/types/blocks";
import type { CanvasImageElement, CanvasPresentation, CanvasSlide } from "@/shared/types/canvas-presentation";
import { presentationToCanvas } from "./canvas-layout";

/**
 * The slides of a presentation that is still being generated, as canvas slides themed like the final deck.
 * The backend only streams whole slides; any slide that still does not parse is left out rather than shown
 * broken. Null until there is at least one slide.
 */
export function partialPresentationToCanvas(partial: Record<string, unknown> | null): CanvasPresentation | null {
  if (!partial || !Array.isArray(partial.blocks)) return null;
  const slides: SlideBlock[] = [];
  for (const block of partial.blocks) {
    const parsed = slideBlockSchema.safeParse(block);
    if (parsed.success) slides.push(parsed.data);
  }
  if (slides.length === 0) return null;
  // The streamed deck may have fewer slides than a stored one is allowed, so it is converted without the
  // whole-document validation.
  const doc = {
    schemaVersion: 1,
    documentType: "presentation",
    themeId: typeof partial.themeId === "string" ? partial.themeId : undefined,
    blocks: slides,
  } as PresentationDocument;
  try {
    return presentationToCanvas(doc);
  } catch {
    return null;
  }
}

/** True when a slide still has an image without its picture. */
export function slideHasPendingImage(slide: CanvasSlide): boolean {
  return slide.elements.some((el) => el.type === "image_placeholder" && !(el as CanvasImageElement).url);
}

/** What the screen follows: the newest slide while writing, then the next picture to come, then nothing. */
export function presentationFollowTarget(
  phase: GenerationPhase,
  imageProgress: ImageProgress | null,
): FollowTarget {
  if (phase === "preparing" || phase === "generating") return "end";
  if (imageProgress && imageProgress.total > 0 && imageProgress.completed < imageProgress.total) return "pending";
  return null;
}
