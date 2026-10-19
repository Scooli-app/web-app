/**
 * Double-click / edit-command dispatch for slide canvas elements.
 * (RED stub: reproduces the pre-fix behavior on purpose.)
 */
import type { CanvasElement } from "@/shared/types/canvas-presentation";

export interface ElementEditHandlers {
  onChangeImage?: (id: string) => void;
  onEditMath?: (id: string) => void;
  startInlineEdit: (id: string) => void;
}

export function dispatchElementEdit(el: CanvasElement, h: ElementEditHandlers): void {
  if (el.type === "math" && h.onEditMath) {
    h.onEditMath(el.id);
    return;
  }
  // BUG: image elements fall through to inline text editing with the prompt.
  h.startInlineEdit(el.id);
}

export function getImagePickerTitleKey(replacing: boolean): "dialogTitle" | "replaceDialogTitle" {
  return replacing ? "dialogTitle" : "dialogTitle";
}
