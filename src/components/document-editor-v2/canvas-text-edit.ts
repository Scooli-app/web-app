/**
 * Pure helpers for the Konva text-edit overlay (SlideKonvaEditor).
 *
 * Kept free of react-konva/DOM so the edit round-trip is unit-testable.
 * The overlay textarea must look like the element on the canvas: list items
 * show their bullet/number markers while editing, and the element's own colour
 * and text decoration are kept. Markers are display-only and stripped on commit
 * so they are never stored in `items`.
 */
import type { CanvasListElement, CanvasTextElement } from "@/shared/types/canvas-presentation";

/** Matches a leading bullet or number marker the overlay itself displays. */
const LIST_MARKER_PREFIX = /^(?:•|[-*]|\d+[.)])\s+/;

export function formatListEditLine(ordered: boolean, index: number, item: string): string {
  return ordered ? `${index + 1}. ${item}` : `• ${item}`;
}

export function getListEditValue(el: CanvasListElement): string {
  const ordered = el.type === "ordered_list";
  return el.items.map((item, i) => formatListEditLine(ordered, i, item)).join("\n");
}

export function parseListEditValue(raw: string, _ordered: boolean): string[] {
  const items = raw
    .split("\n")
    .map((line) => line.trim().replace(LIST_MARKER_PREFIX, "").trim())
    .filter(Boolean);
  return items.length > 0 ? items : [""];
}

export interface TextEditStyle {
  color: string;
  fontFamily?: string;
  fontStyle?: string;
  underline: boolean;
  align?: "left" | "center" | "right";
}

export function getTextEditStyle(el: CanvasTextElement | CanvasListElement): TextEditStyle {
  if (el.type === "text") {
    return {
      color: el.color,
      fontFamily: el.fontFamily,
      fontStyle: el.fontStyle,
      underline: el.underline ?? false,
      align: el.align,
    };
  }
  return { color: el.color, fontFamily: undefined, fontStyle: undefined, underline: false, align: undefined };
}
