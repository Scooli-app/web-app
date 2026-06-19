/**
 * Canvas presentation (schemaVersion: 2).
 *
 * Position-based free-form slide model for the Konva editor.
 * All x, y, w, h values are fractions of slide dimensions (0-1):
 *   pixel_x = x * W,   pixel_y = y * H,   pixel_w = w * W,   pixel_h = h * H
 *   where W = stage width and H = stage height = W * 9/16.
 *
 * Font sizes are stored as fractions of stage WIDTH (e.g. 0.036 = 3.6% of W).
 *   pixel_fontSize = fontSize * W
 *
 * This format is written to document.content on save. The presentation viewer
 * converts it back to SlideBlock[] via canvasToPresentation() for rendering.
 */

export interface CanvasBaseElement {
  id: string;
  x: number; // fraction of W  (0 = left edge)
  y: number; // fraction of H  (0 = top edge)
  w: number; // fraction of W
  h: number; // fraction of H
  /** Clockwise rotation in degrees; 0 = upright; undefined treated as 0. */
  rotation?: number;
}

export interface CanvasTextElement extends CanvasBaseElement {
  type: "text";
  text: string;
  fontSize: number; // fraction of W
  fontStyle: "normal" | "bold" | "italic" | "bold italic";
  fontFamily?: string; // CSS font-family name; undefined -> app default
  color: string;
  align: "left" | "center" | "right";
  underline?: boolean; // text-decoration underline
  /**
   * Semantic role -> used when reconstructing a SlideBlock from canvas elements.
   * "title"    -> slide.title
   * "subtitle" -> slide.subtitle
   * "label"    -> decorative text, not mapped to SlideBlock fields
   */
  role?: "title" | "subtitle" | "label";
}

export interface CanvasListElement extends CanvasBaseElement {
  type: "bullet_list" | "ordered_list";
  items: string[];
  fontSize: number; // fraction of W
  color: string;
  /** Original ContentBlock.id -> preserved for round-trip reconstruction. */
  blockId: string;
}

export interface CanvasMathElement extends CanvasBaseElement {
  type: "math";
  tex: string;
  fontSize: number; // fraction of W
  display: boolean;
  /** Original ContentBlock.id */
  blockId: string;
}

export interface CanvasImageElement extends CanvasBaseElement {
  type: "image_placeholder";
  prompt: string;
  url?: string;
  /** Backend image record ID -> set after upload or AI generation so we can regenerate. */
  imageBackendId?: string;
}

export interface CanvasShapeElement extends CanvasBaseElement {
  type: "shape";
  shape: "rect" | "ellipse" | "line";
  fill?: string;
  stroke?: string;
  /** Fraction of slide width (same convention as fontSize). */
  strokeWidth?: number;
  /** Corner radius in pixels (rects only). 0 = square corners. */
  cornerRadius?: number;
  /** True for shapes owned by the active theme; replaced when theme changes. */
  isDecoration?: boolean;
}

/** Linear gradient descriptor stored per-slide (applied by applyTheme). */
export interface CanvasGradient {
  type: "linear";
  /** CSS-convention angle in degrees: 0=up, 90=right, 135=bottom-right, 180=down. */
  angle: number;
  stops: Array<{ offset: number; color: string }>;
}

export type CanvasElement =
  | CanvasTextElement
  | CanvasListElement
  | CanvasMathElement
  | CanvasImageElement
  | CanvasShapeElement;

export interface CanvasSlide {
  id: string;
  /** Original SlideBlock.layout -> kept for PresentView reconstruction. */
  layout: string;
  background: string;
  /** Optional gradient overlay; when set, rendered on top of `background`. */
  backgroundGradient?: CanvasGradient;
  elements: CanvasElement[];
  /** Hidden slides are dimmed in the sidebar and skipped in presentation mode. */
  hidden?: boolean;
}

export interface CanvasPresentation {
  schemaVersion: 2;
  documentType: "presentation";
  /** Active theme ID (see presentation-theme.ts). Defaults to "dark" if absent. */
  themeId?: string;
  slides: CanvasSlide[];
}

/** Runtime check for v2 canvas format (shallow -> does NOT deep-validate). */
export function isCanvasPresentation(raw: unknown): raw is CanvasPresentation {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as Record<string, unknown>).schemaVersion === 2 &&
    (raw as Record<string, unknown>).documentType === "presentation"
  );
}
