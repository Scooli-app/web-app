/**
 * Text box height resolution for canvas slide text (ENG-231).
 *
 * Konva silently drops wrapped lines that exceed a fixed `height`, so a text
 * box whose stored height is smaller than its wrapped content renders
 * truncated until someone resizes it (the resize path refits the height).
 * The render path applies the same fit: the box grows to its content and
 * never shrinks below the stored height, so layout intent is preserved.
 */

/** Konva drops a wrapped line when the measured height equals the exact fit; keep a small margin. */
const FIT_MARGIN_PX = 1;

export function getFittedTextBoxHeightPx(
  storedHeightPx: number,
  measureNeededHeightPx: () => number,
): number {
  return Math.max(storedHeightPx, measureNeededHeightPx() + FIT_MARGIN_PX);
}
