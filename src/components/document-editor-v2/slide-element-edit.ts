/**
 * Edit dispatch for slide canvas elements (double-click / edit command).
 *
 * Image placeholders never enter inline text editing: their `prompt` is
 * metadata, not visible text, so editing an image always opens the image modal.
 */
import type { CanvasElement } from "@/shared/types/canvas-presentation";

export interface ElementEditHandlers {
  onChangeImage?: (id: string) => void;
  onEditMath?: (id: string) => void;
  startInlineEdit?: (id: string) => void;
}

export function dispatchElementEdit(el: CanvasElement, h: ElementEditHandlers): void {
  if (el.type === "image_placeholder") {
    h.onChangeImage?.(el.id);
    return;
  }
  if (el.type === "math" && h.onEditMath) {
    h.onEditMath(el.id);
    return;
  }
  h.startInlineEdit?.(el.id);
}

export function getImagePickerTitleKey(replacing: boolean): "dialogTitle" | "replaceDialogTitle" {
  return replacing ? "replaceDialogTitle" : "dialogTitle";
}
