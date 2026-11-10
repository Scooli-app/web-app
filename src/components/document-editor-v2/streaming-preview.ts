import { slideBlockSchema, type PresentationDocument, type SlideBlock } from "@/shared/types/blocks";
import type { CanvasPresentation } from "@/shared/types/canvas-presentation";
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
