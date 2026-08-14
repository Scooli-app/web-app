/**
 * SlideKonvaEditor — free-form PowerPoint-style canvas slide editor.
 *
 * Input:  CanvasSlide (position-based v2 format)
 * Output: onChange(updatedElements) — parent owns state
 *
 * Interactions:
 *   Click element       → select (shows Transformer with resize handles)
 *   Drag element        → move (onDragEnd updates x/y)
 *   Drag handle         → resize (onTransformEnd updates w/h)
 *   Dbl-click element   → open textarea overlay for text editing
 *   Click background    → deselect
 *   Delete / Backspace  → remove selected element (global key listener)
 *   Escape              → deselect
 *   "+ Texto" button    → add new text element
 *   "Apagar" button     → remove selected element
 *
 * Coordinate system: all x/y/w/h stored as fractions (0-1) of W and H.
 *   pixel_x = x * W,  pixel_y = y * H,  fontSize_px = fontSize * W
 */
"use client";

import type {
  CanvasElement,
  CanvasGradient,
  CanvasImageElement,
  CanvasListElement,
  CanvasMathElement,
  CanvasShapeElement,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { renderKatexToPngDataUrl } from "@/components/document-editor-v2/math-render";
import { KonvaRichText, measureRichTextHeight } from "@/components/document-editor-v2/KonvaRichText";
import {
  editableElementToMarkdown,
  inlineMarkdownToEditableHtml,
} from "@/shared/utils/inline-markdown";
import type Konva from "konva";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";

/* --------------------------------------------------------------------------
 * Theme tokens — canvas can't use CSS vars so dark-theme values are hardcoded.
 * -------------------------------------------------------------------------- */
const T = {
  bg:          "#16171e",
  text:        "#e5e7eb",
  muted:       "#6c6f80",
  primary:     "#6753FF",
  imageBg:     "#1e2030",
  imageBorder: "#2a2b38",
  selection:   "#6753FF",
  font:        "Inter, system-ui, sans-serif",
};

const FS_BASE = 0.021; // base body font size fraction of W
const MIN_ELEMENT_W = 0.05;
const MIN_ELEMENT_H = 0.02;
const MIN_TEXT_FONT = 0.012;
const MAX_TEXT_FONT = 0.1;
const SHAPE_FILL = "rgba(103, 83, 255, 0.22)";
const SHAPE_STROKE = "#6753FF";
const SHAPE_STROKE_WIDTH = 0.004;
const CORNER_ANCHORS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
const HORIZONTAL_SIDE_ANCHORS = new Set(["middle-left", "middle-right"]);
const VERTICAL_SIDE_ANCHORS = new Set(["top-center", "bottom-center"]);
const MATH_COLOR = T.primary;
const TEXT_LINE_HEIGHT = 1.3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isTextLikeElement(el: CanvasElement): el is CanvasTextElement | CanvasListElement {
  return el.type === "text" || el.type === "bullet_list" || el.type === "ordered_list";
}

function isShapeElement(el: CanvasElement): el is CanvasShapeElement {
  return el.type === "shape";
}

function getTextLikeFontSize(el: CanvasTextElement | CanvasListElement) {
  return el.fontSize;
}

function getTextLikeFontFamily(el: CanvasTextElement | CanvasListElement) {
  if (el.type === "text") return el.fontFamily || T.font;
  return (el as CanvasListElement & { fontFamily?: string }).fontFamily || T.font;
}

function gradientProps(g: CanvasGradient, W: number, H: number, OX = 0, OY = 0) {
  const rad = (g.angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const halfDiag = Math.sqrt(W * W + H * H) / 2;
  return {
    fillLinearGradientStartPoint: { x: OX + W / 2 - dx * halfDiag, y: OY + H / 2 - dy * halfDiag },
    fillLinearGradientEndPoint: { x: OX + W / 2 + dx * halfDiag, y: OY + H / 2 + dy * halfDiag },
    fillLinearGradientColorStops: g.stops.flatMap((s) => [s.offset, s.color]) as number[],
  };
}

/**
 * Per-item pixel heights, measured with the EXACT same word-wrap algorithm
 * {@link KonvaRichText} renders with (real per-run bold/italic glyph widths,
 * the marker's hanging indent applied to every wrapped line \u2014 not just the
 * first). A plain single-style probe ignores both of those, undercounts how
 * many lines a bold-heavy or long item wraps into, and the box it computes
 * ends up too short \u2014 the next element overlaps whatever follows it.
 */
function measureListItemHeightsPx(el: CanvasListElement, widthPx: number, fontSizePx: number) {
  return el.items.map((item, index) =>
    measureRichTextHeight({
      items: [item],
      listType: el.type,
      listStartIndex: index,
      width: widthPx,
      fontSize: fontSizePx,
      fontFamily: getTextLikeFontFamily(el),
      lineHeight: TEXT_LINE_HEIGHT,
    }),
  );
}

/** Same rationale as {@link measureListItemHeightsPx}, for a "text" element or a whole list's total height. */
function measureTextLikeHeightPx(
  el: CanvasTextElement | CanvasListElement,
  widthPx: number,
  fontSizePx: number,
) {
  if (el.type === "text") {
    return measureRichTextHeight({
      text: el.text,
      width: widthPx,
      fontSize: fontSizePx,
      fontFamily: getTextLikeFontFamily(el),
      bold: el.fontStyle === "bold" || el.fontStyle === "bold italic",
      lineHeight: TEXT_LINE_HEIGHT,
    });
  }
  return measureListItemHeightsPx(el, widthPx, fontSizePx).reduce((sum, itemHeight) => sum + itemHeight, 0);
}

function getOppositeAnchorVector(activeAnchor: string, halfW: number, halfH: number) {
  switch (activeAnchor) {
    case "top-left":
      return { x: halfW, y: halfH };
    case "top-right":
      return { x: -halfW, y: halfH };
    case "bottom-left":
      return { x: halfW, y: -halfH };
    case "bottom-right":
      return { x: -halfW, y: -halfH };
    case "middle-left":
      return { x: halfW, y: 0 };
    case "middle-right":
      return { x: -halfW, y: 0 };
    case "top-center":
      return { x: 0, y: halfH };
    case "bottom-center":
      return { x: 0, y: -halfH };
    default:
      return { x: 0, y: 0 };
  }
}

function rotateVector(x: number, y: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/* --------------------------------------------------------------------------
 * useStageSize — responsive 16:9 canvas.
 * Observes a "wrapper" div that fills the available parent space and computes
 * the largest 16:9 stage that fits within both its width AND height, so the
 * slide never needs vertical scrolling.
 * -------------------------------------------------------------------------- */
function useStageSize(wrapperRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ W: 900, H: 506 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const availW = entry.contentRect.width;
      const availH = entry.contentRect.height;
      if (availW <= 0) return;
      // If we know the available height, constrain width so H = W*9/16 ≤ availH.
      const W = availH > 0 ? Math.min(availW, availH * (16 / 9)) : availW;
      setSize({ W: Math.round(W), H: Math.round(W * (9 / 16)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrapperRef]);

  return size;
}

/* --------------------------------------------------------------------------
 * Edit overlays — floating boxes positioned over the canvas element being
 * edited. Three variants, chosen by EditState.kind:
 *
 *   - "text"  → RichTextEditOverlay  (title/paragraph: one contentEditable box)
 *   - "list"  → RichListEditOverlay  (bullet/ordered list: contentEditable ul/ol)
 *   - "plain" → PlainTextEditOverlay (math TeX, image prompt: raw textarea)
 *
 * "text" and "list" use contentEditable rather than a textarea so **bold**
 * shows as actual bold while typing instead of literal asterisks, and support
 * Ctrl/Cmd+B / Ctrl/Cmd+I. Lists get real bullet/number semantics from the
 * browser's native <ul>/<ol> editing — Enter makes a new item, Backspace at
 * the start of an item merges it into the previous one, both for free.
 * -------------------------------------------------------------------------- */
interface EditState {
  id: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily?: string;
  /** Konva fontStyle: "normal" | "bold" | "italic" | "bold italic" */
  fontStyle?: string;
  color: string;
  align?: "left" | "center" | "right";
  kind: "text" | "list" | "plain";
  listType?: "bullet_list" | "ordered_list";
}

const EDIT_BOX_STYLE_BASE: CSSProperties = {
  position: "absolute",
  background: "transparent",
  outline: "none",
  boxShadow: `0 0 0 2px ${T.selection}55`, // translucent focus ring
  borderRadius: 4,
  boxSizing: "border-box",
  zIndex: 10,
  lineHeight: 1.3,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflowWrap: "break-word",
};

/** Ctrl+B / Cmd+B and Ctrl+I / Cmd+I → toggle inline bold/italic on the current selection. */
function handleFormattingShortcut(e: ReactKeyboardEvent): boolean {
  if (!(e.metaKey || e.ctrlKey)) return false;
  const key = e.key.toLowerCase();
  if (key === "b") {
    e.preventDefault();
    document.execCommand("bold");
    return true;
  }
  if (key === "i") {
    e.preventDefault();
    document.execCommand("italic");
    return true;
  }
  return false;
}

/** Places the caret at the end of `el`'s content. */
function focusAtEnd(el: HTMLElement) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * RichTextEditOverlay — WYSIWYG inline editing for a "text" element (title,
 * heading, paragraph). A single contentEditable box seeded with real
 * <strong>/<em> so **bold** looks bold immediately, not as raw asterisks.
 */
function RichTextEditOverlay({
  edit,
  onCommit,
}: {
  edit: EditState;
  onCommit: (id: string, value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Seeded once at mount — this box is uncontrolled from here on (matches the
  // original textarea's approach): the browser owns all further DOM mutations
  // until commit, so nothing here re-renders while the user types.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- edit.value is fixed for the life of one edit session (keyed by edit.id)
  const initialHtml = useMemo(() => inlineMarkdownToEditableHtml(edit.value), [edit.id]);

  useEffect(() => {
    const el = ref.current;
    if (el) focusAtEnd(el);
  }, [edit.id]);

  const commit = () => onCommit(edit.id, ref.current ? editableElementToMarkdown(ref.current) : edit.value);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: initialHtml }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (handleFormattingShortcut(e)) return;
        if (e.key === "Escape") { e.preventDefault(); commit(); }
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
      }}
      style={{
        ...EDIT_BOX_STYLE_BASE,
        left: edit.x,
        top: edit.y,
        width: edit.width,
        minHeight: edit.height,
        fontSize: edit.fontSize,
        fontFamily: edit.fontFamily ?? T.font,
        fontWeight: edit.fontStyle?.includes("bold") ? "bold" : "normal",
        fontStyle: edit.fontStyle?.includes("italic") ? "italic" : "normal",
        color: edit.color,
        caretColor: edit.color,
        textAlign: edit.align ?? "left",
        padding: 0,
      }}
    />
  );
}

/**
 * RichListEditOverlay — WYSIWYG inline editing for a bullet/ordered list. A
 * real contentEditable <ul>/<ol> with one <li> per item: the browser's native
 * list editing gives Enter → new item and Backspace-at-start → merge with the
 * previous item for free, and each item shows real bold/italic while typing.
 */
function RichListEditOverlay({
  edit,
  onCommit,
}: {
  edit: EditState;
  onCommit: (id: string, value: string) => void;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  // Same uncontrolled-after-mount rationale as RichTextEditOverlay.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- edit.value is fixed for the life of one edit session (keyed by edit.id)
  const items = useMemo(() => edit.value.split("\n"), [edit.id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Land the caret in the last item, not the first — matches where a
    // double-click on the list group's last line would put you.
    const lastItem = el.lastElementChild as HTMLElement | null;
    focusAtEnd(lastItem ?? el);
  }, [edit.id]);

  const commit = () => {
    const el = containerRef.current;
    if (!el) { onCommit(edit.id, edit.value); return; }
    const liItems = Array.from(el.children).map((li) => editableElementToMarkdown(li as HTMLElement));
    onCommit(edit.id, liItems.join("\n"));
  };

  const sharedProps = {
    ref: (node: HTMLElement | null) => { containerRef.current = node; },
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: commit,
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (handleFormattingShortcut(e)) return;
      if (e.key === "Escape") { e.preventDefault(); commit(); }
      // Enter (new item) and Backspace-merge are native <ul>/<ol> contentEditable behaviour.
    },
    style: {
      ...EDIT_BOX_STYLE_BASE,
      left: edit.x,
      top: edit.y,
      width: edit.width,
      minHeight: edit.height,
      margin: 0,
      padding: 0,
      // Tailwind's Preflight resets every <ul>/<ol> site-wide to
      // `list-style: none` — without overriding it here, this box (which
      // isn't inside a `.tiptap` scope, the only place that reset is undone
      // elsewhere in the app) silently has no visible bullets/numbers at all.
      listStyleType: edit.listType === "ordered_list" ? "decimal" : "disc",
      // "inside" keeps the marker within the box's own width (this is a
      // left:edit.x-positioned overlay with no room to spare on the left),
      // at the cost of not matching KonvaRichText's hanging indent exactly —
      // an acceptable difference for a temporary edit view.
      listStylePosition: "inside",
      fontSize: edit.fontSize,
      fontFamily: edit.fontFamily ?? T.font,
      color: edit.color,
      caretColor: edit.color,
    } satisfies CSSProperties,
  };

  const liNodes = items.map((item, i) => (
    <li key={i} dangerouslySetInnerHTML={{ __html: inlineMarkdownToEditableHtml(item) }} />
  ));

  return edit.listType === "ordered_list"
    ? <ol {...sharedProps}>{liNodes}</ol>
    : <ul {...sharedProps}>{liNodes}</ul>;
}

/**
 * PlainTextEditOverlay — raw textarea for content that is NOT limited-markdown
 * (math TeX source, an image generation prompt). Unchanged from before the
 * rich-text overlays existed: showing **literal** text here is correct, not a
 * bug, since these fields are never rendered through the markdown grammar.
 */
function PlainTextEditOverlay({
  edit,
  onCommit,
}: {
  edit: EditState;
  onCommit: (id: string, value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, edit.height)}px`;
  }, [edit.id, edit.height]);

  const autoResize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, edit.height)}px`;
  };

  const commit = () => onCommit(edit.id, ref.current?.value ?? edit.value);

  return (
    <textarea
      ref={ref}
      defaultValue={edit.value}
      onInput={autoResize}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); commit(); }
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
      }}
      style={{
        ...EDIT_BOX_STYLE_BASE,
        left: edit.x,
        top: edit.y,
        width: edit.width,
        height: edit.height,
        fontSize: edit.fontSize,
        fontFamily: edit.fontFamily ?? T.font,
        color: edit.color,
        caretColor: edit.color,
        textAlign: edit.align ?? "left",
        border: "none",
        padding: 0,
        resize: "none",
        overflow: "hidden",
      }}
    />
  );
}

/* --------------------------------------------------------------------------
 * SlideKonvaEditor
 * -------------------------------------------------------------------------- */

/** Imperative handle exposed to the parent for toolbar-triggered actions. */
export interface SlideKonvaEditorHandle {
  addText: () => void;
  removeSelected: () => void;
  clearSelection: () => void;
}

export const SlideKonvaEditor = forwardRef<
  SlideKonvaEditorHandle,
  {
    slide: CanvasSlide;
    onChange: (elements: CanvasElement[]) => void;
    onSelectionChange?: (id: string | null) => void;
    /** Called when the user clicks the change-image button on an image element. */
    onChangeImage?: (elementId: string) => void;
    /** Called when a math element is double-clicked, to open the formula modal. */
    onEditMath?: (elementId: string) => void;
  }
>(function SlideKonvaEditor({ slide, onChange, onSelectionChange, onChangeImage, onEditMath }, ref) {
  /** Fills the available parent space — measured to compute stage size. */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const { W, H } = useStageSize(wrapperRef);
  // Overflow region (30% on each side) — elements render outside the slide bounds
  // and are clipped by the Stage canvas edges, just like in Teachy.
  const OX = Math.round(W * 0.3);
  const OY = Math.round(H * 0.3);

  const elements = slide.elements;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  /** Active snap guide lines (cleared on drag end). */
  const [guides, setGuides] = useState<{ vLines: number[]; hLines: number[] }>({ vLines: [], hLines: [] });
  const isDraggingRef = useRef(false);
  /**
   * Absolute position of the anchor OPPOSITE the one being dragged, captured
   * once at transform start. Reused every tick so the resize keeps that corner
   * visually fixed (Konva moves node.x()/y() mid-transform, so recomputing the
   * fixed point each tick would drift and make the element jump).
   */
  const transformFixedRef = useRef<{ x: number; y: number } | null>(null);
  /**
   * Live position of the selected node while dragging/transforming.
   * Updated on every onDragMove / onTransform tick so overlay buttons
   * follow the element in real-time (like Teachy). Cleared on pointer-up.
   */
  const [livePos, setLivePos] = useState<{
    cx: number; cy: number; halfW: number; halfH: number; rotation: number;
  } | null>(null);
  /**
   * Live width/height/fontSize (fractions) for the text-like element currently
   * being resized. Position stays imperatively Konva-driven (see
   * applyLiveTextLikeGeometry) for pixel-perfect tracking of the drag, but
   * content dimensions go through this state so KonvaRichText re-renders with
   * its OWN real word-wrap on every tick — the box visibly reflows as you
   * drag, rather than only snapping to the correct layout on release.
   */
  const [liveTextGeometry, setLiveTextGeometry] = useState<{
    id: string; w: number; h: number; fontSize: number;
  } | null>(null);
  /**
   * requestAnimationFrame coalescing for liveTextGeometry. A resize drag can
   * fire many more raw Konva 'transform' ticks per second than the display
   * can paint — each one, unthrottled, forced a full React re-render that
   * recreates every KonvaRichText Text node for the box (word-wrap + canvas
   * measureText + Konva reconcile). That's expensive enough to occasionally
   * block the main thread past the next pointermove, which the browser then
   * coalesces/drops — Konva's own drag/transform handling shares that same
   * thread, so the box visibly stops tracking the cursor for a tick. Capping
   * the actual re-render to once per animation frame (not once per raw tick)
   * keeps the expensive work at the display's own pace instead of the mouse's.
   */
  const liveGeometryRafRef = useRef<number | null>(null);
  const pendingLiveGeometryRef = useRef<{ id: string; w: number; h: number; fontSize: number } | null>(null);

  const cancelScheduledLiveTextGeometry = useCallback(() => {
    if (liveGeometryRafRef.current !== null) {
      cancelAnimationFrame(liveGeometryRafRef.current);
      liveGeometryRafRef.current = null;
    }
    pendingLiveGeometryRef.current = null;
  }, []);

  const scheduleLiveTextGeometry = useCallback(
    (next: { id: string; w: number; h: number; fontSize: number }) => {
      pendingLiveGeometryRef.current = next;
      if (liveGeometryRafRef.current !== null) return; // a flush is already queued for this frame
      liveGeometryRafRef.current = requestAnimationFrame(() => {
        liveGeometryRafRef.current = null;
        setLiveTextGeometry(pendingLiveGeometryRef.current);
      });
    },
    [],
  );

  // Unmount safety: don't let a queued rAF fire setState after teardown.
  useEffect(() => () => cancelScheduledLiveTextGeometry(), [cancelScheduledLiveTextGeometry]);

  // Clear live position/geometry whenever selection changes.
  useEffect(() => {
    cancelScheduledLiveTextGeometry();
    setLivePos(null);
    setLiveTextGeometry(null);
  }, [selectedId, cancelScheduledLiveTextGeometry]);

  // Re-sync the Transformer's outline/handles once a live-resize content
  // re-render has actually committed — not synchronously inside the
  // transform-tick handler, which ran BEFORE KonvaRichText's new layout
  // existed and produced a one-frame mismatch (outline resized, text hadn't
  // caught up yet). useLayoutEffect (not useEffect) so this runs in the same
  // paint as the committed DOM/Konva mutation rather than one frame later.
  useLayoutEffect(() => {
    if (!liveTextGeometry) return;
    trRef.current?.forceUpdate();
    trRef.current?.getLayer()?.batchDraw();
  }, [liveTextGeometry]);

  /* ── Image URL cache: url → loaded HTMLImageElement ────────────────────── */
  // We use a ref as the cache store (avoids re-renders during load) and a
  // counter state to trigger a redraw once each image finishes loading.
  const imgCacheRef = useRef<Record<string, HTMLImageElement | "loading">>({});
  const mathCacheRef = useRef<Record<string, HTMLImageElement | "loading">>({});
  const [imgRevision, setImgRevision] = useState(0);

  useEffect(() => {
    let changed = false;
    for (const el of elements) {
      if (el.type !== "image_placeholder") continue;
      const img = el as CanvasImageElement;
      const { url } = img;
      if (!url || url in imgCacheRef.current) continue;
      imgCacheRef.current[url] = "loading";
      changed = true;
      const i = new window.Image();
      i.crossOrigin = "anonymous";
      i.onload = () => {
        imgCacheRef.current[url] = i;
        setImgRevision((r) => r + 1); // trigger re-render
      };
      i.onerror = () => {
        // Remove from cache so a retry is possible
        delete imgCacheRef.current[url];
      };
      i.src = url;
    }
    if (changed) setImgRevision((r) => r + 1); // repaint while loading
  }, [elements]);

  useEffect(() => {
    let cancelled = false;
    let changed = false;

    for (const el of elements) {
      if (el.type !== "math") continue;
      const math = el as CanvasMathElement;
      const pixelHeight = Math.max(1, Math.round(el.h * H));
      const cacheKey = `${math.tex}__${MATH_COLOR}__${pixelHeight}`;
      if (cacheKey in mathCacheRef.current) continue;
      mathCacheRef.current[cacheKey] = "loading";
      changed = true;

      void renderKatexToPngDataUrl(math.tex, { color: MATH_COLOR, pixelHeight })
        .then(({ dataUrl }) => {
          if (cancelled || !dataUrl) {
            if (!dataUrl) delete mathCacheRef.current[cacheKey];
            return;
          }
          const image = new window.Image();
          image.onload = () => {
            if (cancelled) return;
            mathCacheRef.current[cacheKey] = image;
            setImgRevision((r) => r + 1);
          };
          image.onerror = () => {
            delete mathCacheRef.current[cacheKey];
          };
          image.src = dataUrl;
        })
        .catch(() => {
          delete mathCacheRef.current[cacheKey];
        });
    }

    if (changed) setImgRevision((r) => r + 1);
    return () => {
      cancelled = true;
    };
  }, [elements, H]);

  /* ── Notify parent when selection changes ──────────────────────────────── */
  useEffect(() => {
    onSelectionChange?.(selectedId);
  }, [selectedId, onSelectionChange]);

  /* ── Transformer — attach to selected node ─────────────────────────────── */
  // Detach handles while editState is active so the resize ring doesn't sit
  // on top of the textarea overlay.  selectedId is intentionally kept non-null
  // during editing so the parent's contextual toolbar stays visible.
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedId && !editState) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node as Konva.Node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements, editState]);

  /* ── Global keyboard: Delete → remove, Escape → deselect ──────────────── */
  useEffect(() => {
    if (!selectedId || editState) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't interfere if a native input is focused
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        onChange(elements.filter((el) => el.id !== selectedId && !(el.type === "shape" && (el as CanvasShapeElement).isDecoration)));
        setSelectedId(null);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, editState, elements, onChange]);

  /* ── Helpers ─────────────────────────────────────────────────────────────── */

  const updateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      onChange(
        elements.map((e) =>
          e.id === id ? ({ ...e, ...patch } as CanvasElement) : e,
        ),
      );
    },
    [elements, onChange],
  );

  const setStageCursor = useCallback((cursor: string) => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor = cursor;
    }
  }, []);

  const getFittedTextLikeHeight = useCallback(
    (
      el: CanvasTextElement | CanvasListElement,
      widthFraction: number,
      fontSizeFraction: number,
    ) => {
      const widthPx = Math.max(1, widthFraction * W);
      const fontSizePx = fontSizeFraction * W;
      const heightPx = measureTextLikeHeightPx(el, widthPx, fontSizePx);
      return Math.max(MIN_ELEMENT_H, heightPx / H);
    },
    [W, H],
  );

  const applyLiveTextLikeGeometry = useCallback(
    (
      node: Konva.Node,
      el: CanvasTextElement | CanvasListElement,
      activeAnchor: string,
      nextW: number,
      nextH: number,
      nextFontSize: number,
    ) => {
      // Prefer the fixed point captured at transform start; only fall back to a
      // live recompute (which can drift) when it is unavailable.
      const fixedPoint = transformFixedRef.current ?? (() => {
        const v = getOppositeAnchorVector(activeAnchor, node.offsetX(), node.offsetY());
        const off = rotateVector(v.x, v.y, node.rotation());
        return { x: node.x() + off.x, y: node.y() + off.y };
      })();
      const widthPx = nextW * W;
      const heightPx = nextH * H;
      const nextHalfW = widthPx / 2;
      const nextHalfH = heightPx / 2;
      const nextVector = getOppositeAnchorVector(activeAnchor, nextHalfW, nextHalfH);
      const nextOffset = rotateVector(nextVector.x, nextVector.y, node.rotation());

      node.x(fixedPoint.x - nextOffset.x);
      node.y(fixedPoint.y - nextOffset.y);

      node.offsetX(nextHalfW);
      node.offsetY(nextHalfH);
      node.setAttr("scooliWidth", nextW);
      node.setAttr("scooliHeight", nextH);
      node.setAttr("scooliFontSize", nextFontSize);
      node.setAttr("scooliHalfW", nextHalfW);
      node.setAttr("scooliHalfH", nextHalfH);

      // Position/pivot (above) stays imperative — Konva owns it moment to
      // moment so dragging feels perfectly attached to the cursor, and
      // react-konva's prop diffing leaves it alone since el.x/el.y/el.w/el.h
      // in the committed `elements` state haven't changed yet.
      //
      // Content dimensions go through React state instead: "text" and list
      // elements render as a Group wrapping a hit Rect plus one or more
      // KonvaRichText instances (each itself a Group of Text runs whose count
      // varies with how bold segments wrap), so there's no single node to
      // imperatively resize/reflow by hand the way one plain Konva.Text could
      // be. Pushing the live width/height/fontSize into state instead makes
      // KonvaRichText re-render with its OWN real layout() on every tick —
      // genuine live reflow, not just a resizing outline with static text.
      const group = node as Konva.Group;
      const hitRect = group.findOne("Rect");
      if (hitRect) {
        hitRect.width(widthPx);
        hitRect.height(heightPx);
      }
      scheduleLiveTextGeometry({ id: el.id, w: nextW, h: nextH, fontSize: nextFontSize });
    },
    [W, H, scheduleLiveTextGeometry],
  );

  const getTextTransformMetrics = useCallback(
    (
      el: CanvasTextElement | CanvasListElement,
      sx: number,
      sy: number,
      activeAnchor?: string | null,
    ) => {
      const absScaleX = Math.abs(sx);
      const absScaleY = Math.abs(sy);

      if (activeAnchor && CORNER_ANCHORS.has(activeAnchor)) {
        const factor = (absScaleX + absScaleY) / 2;
        return {
          newW: Math.max(MIN_ELEMENT_W, el.w * absScaleX),
          newH: Math.max(MIN_ELEMENT_H, el.h * absScaleY),
          newFontSize: clamp(getTextLikeFontSize(el) * factor, MIN_TEXT_FONT, MAX_TEXT_FONT),
        };
      }

      if (activeAnchor && HORIZONTAL_SIDE_ANCHORS.has(activeAnchor)) {
        return {
          newW: Math.max(MIN_ELEMENT_W, el.w * absScaleX),
          newH: el.h,
          newFontSize: getTextLikeFontSize(el),
        };
      }

      if (activeAnchor && VERTICAL_SIDE_ANCHORS.has(activeAnchor)) {
        return {
          newW: el.w,
          newH: Math.max(MIN_ELEMENT_H, el.h * absScaleY),
          newFontSize: getTextLikeFontSize(el),
        };
      }

      return null;
    },
    [],
  );

  /**
   * Snaps the node to nearby alignment lines during drag and draws guide lines.
   * Checks left/center/right and top/center/bottom edges of the dragged element
   * against stage boundaries, stage centre, and all other elements' edges.
   */
  const handleDragMove = useCallback(
    (id: string, node: Konva.Node) => {
      const THRESH = 6;
      const hw = Number(node.getAttr("scooliHalfW")) || node.offsetX();
      const hh = Number(node.getAttr("scooliHalfH")) || node.offsetY();
      const cx = node.x();
      const cy = node.y();

      // Collect vertical (x) and horizontal (y) snap lines — in stage space (offset by OX/OY)
      const vLines: number[] = [OX, OX + W / 2, OX + W];
      const hLines: number[] = [OY, OY + H / 2, OY + H];
      for (const el of elements) {
        if (el.id === id) continue;
        const ecx = el.x * W + OX + el.w * W / 2;
        const ecy = el.y * H + OY + el.h * H / 2;
        const ehw = el.w * W / 2;
        const ehh = el.h * H / 2;
        vLines.push(ecx - ehw, ecx, ecx + ehw);
        hLines.push(ecy - ehh, ecy, ecy + ehh);
      }

      // Find closest snap for x axis: test left / center / right edge of dragged el
      type Snap = { newCenter: number; guide: number; dist: number };
      let bestX: Snap | null = null;
      for (const edge of [cx - hw, cx, cx + hw]) {
        for (const line of vLines) {
          const dist = Math.abs(edge - line);
          if (dist < THRESH && (bestX === null || dist < bestX.dist)) {
            bestX = { newCenter: cx + (line - edge), guide: line, dist };
          }
        }
      }

      let bestY: Snap | null = null;
      for (const edge of [cy - hh, cy, cy + hh]) {
        for (const line of hLines) {
          const dist = Math.abs(edge - line);
          if (dist < THRESH && (bestY === null || dist < bestY.dist)) {
            bestY = { newCenter: cy + (line - edge), guide: line, dist };
          }
        }
      }

      if (bestX !== null) node.x(bestX.newCenter);
      if (bestY !== null) node.y(bestY.newCenter);

      setGuides({
        vLines: bestX !== null ? [bestX.guide] : [],
        hLines: bestY !== null ? [bestY.guide] : [],
      });

      // Update live overlay position so buttons follow in real-time.
      // Store in container space (stage space minus OX/OY).
      setLivePos({
        cx: node.x() - OX,
        cy: node.y() - OY,
        halfW: node.offsetX(),
        halfH: node.offsetY(),
        rotation: node.rotation(),
      });
    },
    [W, H, OX, OY, elements],
  );

  const handleDragEnd = useCallback(
    (id: string, node: Konva.Node) => {
      isDraggingRef.current = false;
      setStageCursor("default");
      setGuides({ vLines: [], hLines: [] }); // clear guides
      setLivePos(null); // return to committed-state position
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      // node positions are in stage space (include OX/OY offset).
      // Subtract OX/OY before converting back to slide fractions.
      updateElement(id, {
        x: (node.x() - OX - el.w * W / 2) / W,
        y: (node.y() - OY - el.h * H / 2) / H,
      });
    },
    [W, H, OX, OY, elements, updateElement, setStageCursor],
  );

  /**
   * Called on every Transformer tick (onTransform) — keeps the overlay buttons
   * locked to the element's visual corner during live resize/rotate, and shows
   * snap guide lines when the rotation is close to a cardinal/diagonal angle.
   */
  const handleTransformLive = useCallback(
    (id: string, node: Konva.Node) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const activeAnchor = trRef.current?.getActiveAnchor();
      let liveW = Math.max(MIN_ELEMENT_W, el.w * Math.abs(node.scaleX()));
      let liveH = Math.max(MIN_ELEMENT_H, el.h * Math.abs(node.scaleY()));

      if (isTextLikeElement(el) && activeAnchor) {
        const metrics = getTextTransformMetrics(el, node.scaleX(), node.scaleY(), activeAnchor);
        if (metrics) {
          liveW = metrics.newW;
          const fittedH = getFittedTextLikeHeight(el, metrics.newW, metrics.newFontSize);
          liveH =
            CORNER_ANCHORS.has(activeAnchor) || HORIZONTAL_SIDE_ANCHORS.has(activeAnchor)
              ? fittedH
              : Math.max(metrics.newH, fittedH);
          applyLiveTextLikeGeometry(node, el, activeAnchor, metrics.newW, liveH, metrics.newFontSize);
          node.scaleX(1);
          node.scaleY(1);
          // This forceUpdate() is NOT cosmetic — removing it (as a previous
          // pass here did, to stop the outline visually leading the throttled
          // content by a frame) broke the Transformer's own math. The
          // Transformer computes each tick's scale as a delta against the
          // anchor/size it captured internally; once we reset scale to 1 and
          // move the offset out from under it, that internal reference goes
          // stale until forceUpdate() tells it to recapture the node's actual
          // current bounds. Skip this and the NEXT tick's scale is computed
          // against a stale reference, compounding tick over tick — which is
          // exactly "flickers through huge/correct/small sizes and lags
          // behind the cursor". Must run synchronously, same tick, before the
          // next native pointer event — an effect (necessarily deferred to
          // after React commits) is too late to prevent the next tick's math
          // from already having gone wrong.
          trRef.current?.forceUpdate();
          node.getLayer()?.batchDraw();
        }
      }

      setLivePos({
        cx: node.x() - OX,  // container space
        cy: node.y() - OY,
        halfW: liveW * W / 2,
        halfH: liveH * H / 2,
        rotation: node.rotation(),
      });

      // Show guide lines through the element center when near a snap angle.
      const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
      const THRESH = 4; // degrees
      const rot = ((node.rotation() % 360) + 360) % 360;
      const nearSnap = SNAP_ANGLES.some(
        (a) => Math.min(Math.abs(rot - a), Math.abs(rot - a + 360), Math.abs(rot - a - 360)) < THRESH,
      );
      if (nearSnap) {
        setGuides({ vLines: [node.x()], hLines: [node.y()] });
      } else {
        setGuides({ vLines: [], hLines: [] });
      }
    },
    [W, H, OX, OY, applyLiveTextLikeGeometry, elements, getFittedTextLikeHeight, getTextTransformMetrics],
  );

  /**
   * After Transformer resize/rotate: reset scale to 1, update fractional w/h
   * and save rotation.  We render with offsetX/Y = w*W/2, h*H/2 so node.x/y()
   * is the CENTER of the element.  After computing new dimensions we update the
   * offset on the node so the next drag uses the correct pivot.
   */
  const handleTransformEnd = useCallback(
    (id: string, node: Konva.Node) => {
      setGuides({ vLines: [], hLines: [] });
      setLivePos(null);
      // Cancel first: a queued rAF flush landing AFTER this would resurrect a
      // stale liveTextGeometry and override the final committed render below.
      cancelScheduledLiveTextGeometry();
      setLiveTextGeometry(null);
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const activeAnchor = trRef.current?.getActiveAnchor();
      const sx = node.scaleX();
      const sy = node.scaleY();
      let newW = Math.max(MIN_ELEMENT_W, el.w * Math.abs(sx));
      let newH = Math.max(MIN_ELEMENT_H, el.h * Math.abs(sy));
      let newFontSize: number | null = null;

      if (isTextLikeElement(el)) {
        const liveW = Number(node.getAttr("scooliWidth"));
        const liveH = Number(node.getAttr("scooliHeight"));
        const liveFontSize = Number(node.getAttr("scooliFontSize"));
        const liveMetricsAvailable =
          Number.isFinite(liveW) &&
          Number.isFinite(liveH) &&
          Number.isFinite(liveFontSize);

        if (liveMetricsAvailable) {
          newW = liveW;
          newH = liveH;
          newFontSize = liveFontSize;
        } else {
          const metrics = getTextTransformMetrics(el, sx, sy, activeAnchor);
          if (metrics) {
            newW = metrics.newW;
            newH = metrics.newH;
            newFontSize = metrics.newFontSize;
          }
        }

        if (newFontSize !== null) {
          const fittedH = getFittedTextLikeHeight(el, newW, newFontSize);
          newH =
            activeAnchor && VERTICAL_SIDE_ANCHORS.has(activeAnchor)
              ? Math.max(newH, fittedH)
              : fittedH;
        }
      } else if (isShapeElement(el)) {
        newW = Math.max(MIN_ELEMENT_W, el.w * Math.abs(sx));
        newH = Math.max(MIN_ELEMENT_H, el.h * Math.abs(sy));
      }

      const cx = node.x(); // center x in pixels
      const cy = node.y(); // center y in pixels
      // Reset scale and update offset so the pivot matches the new size
      node.scaleX(1);
      node.scaleY(1);
      if (isShapeElement(el) && el.shape === "ellipse") {
        node.offsetX(0);
        node.offsetY(0);
      } else {
        node.offsetX(newW * W / 2);
        node.offsetY(newH * H / 2);
      }
      node.setAttr("scooliHalfW", newW * W / 2);
      node.setAttr("scooliHalfH", newH * H / 2);
      // Keep the Text node's own width/height authoritative so the Transformer
      // border matches the committed (fitted) box exactly — no ghost second box.
      if (!isShapeElement(el) && typeof (node as Konva.Text).width === "function") {
        (node as Konva.Text).width(newW * W);
        (node as Konva.Text).height(newH * H);
      }
      trRef.current?.forceUpdate();
      node.getLayer()?.batchDraw();
      // Convert center position back to top-left fraction for storage.
      // Subtract OX/OY (stage space → slide space).
      const rawX = (cx - OX - newW * W / 2) / W;
      const rawY = (cy - OY - newH * H / 2) / H;
      updateElement(id, {
        x: rawX,
        y: rawY,
        w: newW,
        h: newH,
        ...(newFontSize !== null ? { fontSize: newFontSize } : {}),
        rotation: node.rotation(),
      });
    },
    [W, H, OX, OY, cancelScheduledLiveTextGeometry, elements, getFittedTextLikeHeight, getTextTransformMetrics, updateElement],
  );

  const startEdit = useCallback(
    (id: string, node: Konva.Node, value: string) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const isList = el.type === "bullet_list" || el.type === "ordered_list";
      const absPos = node.getAbsolutePosition();
      const fs =
        el.type === "text" ? (el as CanvasTextElement).fontSize * W
        : isList ? (el as CanvasListElement).fontSize * W
        : el.type === "math" ? (el as CanvasMathElement).fontSize * W
        : FS_BASE * W;
      const color =
        el.type === "text" ? (el as CanvasTextElement).color
        : el.type === "math" ? MATH_COLOR
        : T.muted;
      const fontFamily =
        el.type === "text" ? (el as CanvasTextElement).fontFamily : undefined;
      const fontStyle =
        el.type === "text" ? (el as CanvasTextElement).fontStyle : undefined;
      const align =
        el.type === "text" ? (el as CanvasTextElement).align : undefined;
      // "text" and lists are limited-markdown content → WYSIWYG contentEditable
      // overlay. Math TeX and image prompts are raw strings, never rendered
      // through the markdown grammar, so they stay a plain textarea.
      const kind: EditState["kind"] = el.type === "text" ? "text" : isList ? "list" : "plain";

      // Keep selectedId pointing at the element so the parent contextual
      // toolbar stays visible.  The Transformer effect clears its handles
      // whenever editState is non-null (see effect above).
      //
      // absPos is stage-space origin (= center, because offsetX/Y = w/2, h/2).
      // Subtract OX/OY to convert to container space, then the half-size offset
      // to get the visual top-left for the textarea overlay.
      setEditState({
        id,
        value,
        x: absPos.x - OX - el.w * W / 2,
        y: absPos.y - OY - el.h * H / 2,
        width: el.w * W,
        height: Math.max(el.h * H, fs * 1.5),
        fontSize: fs,
        fontFamily,
        fontStyle,
        color,
        align,
        kind,
        listType: isList ? (el as CanvasListElement).type : undefined,
      });
    },
    [elements, W, H, OX, OY],
  );

  const commitEdit = useCallback(
    (id: string, raw: string) => {
      setEditState(null);
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      if (el.type === "text") {
        if (raw.trim().length === 0) {
          onChange(elements.filter((element) => element.id !== id));
          if (selectedId === id) setSelectedId(null);
          return;
        }
        const nextEl = { ...el, text: raw };
        updateElement(id, {
          text: raw,
          h: getFittedTextLikeHeight(nextEl, nextEl.w, nextEl.fontSize),
        } as Partial<CanvasTextElement>);
      } else if (el.type === "bullet_list" || el.type === "ordered_list") {
        const items = raw.split("\n").map((s) => s.trim()).filter(Boolean);
        const nextEl = {
          ...el,
          items: items.length > 0 ? items : [""],
        };
        updateElement(id, {
          items: nextEl.items,
          h: getFittedTextLikeHeight(nextEl, nextEl.w, nextEl.fontSize),
        } as Partial<CanvasListElement>);
      } else if (el.type === "math") {
        updateElement(id, { tex: raw } as Partial<CanvasMathElement>);
      } else if (el.type === "image_placeholder") {
        updateElement(id, { prompt: raw } as Partial<CanvasImageElement>);
      }
    },
    [elements, getFittedTextLikeHeight, onChange, selectedId, updateElement],
  );

  /* ── Add text element ──────────────────────────────────────────────────── */
  const addText = useCallback(() => {
    const newId = `text-${Date.now()}`;
    const newEl: CanvasTextElement = {
      id: newId,
      type: "text",
      x: 0.10,
      y: 0.40,
      w: 0.80,
      h: 0.12,
      text: "Novo texto",
      fontSize: FS_BASE,
      fontStyle: "normal",
      color: T.text,
      align: "left",
    };
    onChange([...elements, newEl]);
    setSelectedId(newId);
  }, [elements, onChange]);

  /* ── Remove selected element ──────────────────────────────────────────── */
  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    onChange(elements.filter((e) => e.id !== selectedId && !(e.type === "shape" && (e as CanvasShapeElement).isDecoration)));
    setSelectedId(null);
  }, [selectedId, elements, onChange]);

  /* ── Imperative handle (for parent toolbar actions) ────────────────────── */
  useImperativeHandle(ref, () => ({
    addText,
    removeSelected,
    clearSelection: () => setSelectedId(null),
  }), [addText, removeSelected]);

  /* ── Shared draggable/selectable props per element ─────────────────────── */
  // Inline to avoid TypeScript spread issues with different Konva node types
  const dragSelectProps = (id: string) => ({
    draggable: true,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (editState?.id !== id) setSelectedId(id);
    },
    onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.cancelBubble = true;
      if (editState?.id !== id) setSelectedId(id);
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) =>
      handleDragMove(id, e.target),
    onDragStart: () => {
      isDraggingRef.current = true;
      setStageCursor("grabbing");
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      handleDragEnd(id, e.target);
      setStageCursor("default");
    },
    onTransformStart: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const anchor = trRef.current?.getActiveAnchor();
      if (!anchor) { transformFixedRef.current = null; return; }
      // node geometry is still committed here (scale = 1), so the opposite
      // anchor's absolute position is the true pivot to keep fixed.
      const v = getOppositeAnchorVector(anchor, node.offsetX(), node.offsetY());
      const off = rotateVector(v.x, v.y, node.rotation());
      transformFixedRef.current = { x: node.x() + off.x, y: node.y() + off.y };
    },
    onTransform: (e: Konva.KonvaEventObject<Event>) =>
      handleTransformLive(id, e.target),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      handleTransformEnd(id, e.target);
      transformFixedRef.current = null;
    },
  });

  /* ── Render ──────────────────────────────────────────────────────────────── */
  // imgRevision is intentionally read here so React re-renders when images load.
  void imgRevision;
  return (
    <div ref={wrapperRef} className="flex h-full w-full items-center justify-center">
      {/* Inner div is the visible slide area; overflow:visible lets elements
          spill outside the slide boundary (the oversized Stage handles the rest). */}
      <div
        className="relative select-none rounded-xl shadow-xl"
        style={{ width: W, height: H, overflow: "visible" }}
      >
        {/* Floating action buttons — stacked to the left of the selected element */}
        {selectedId && !editState && (() => {
          const el = elements.find((e) => e.id === selectedId);
          if (!el) return null;
          // Use livePos during drag/transform for real-time tracking, else
          // fall back to committed element state.
          const halfW = livePos ? livePos.halfW : (el.w * W) / 2;
          const halfH = livePos ? livePos.halfH : (el.h * H) / 2;
          const cx = livePos ? livePos.cx : (el.x * W + halfW);
          const cy = livePos ? livePos.cy : (el.y * H + halfH);
          // Rotate the top-left corner (local -halfW,-halfH) around the center
          // so the controls follow the element's rotation.
          const rot = livePos ? livePos.rotation : (el.rotation ?? 0);
          const rad = (rot * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const cornerX = cx + (-halfW * cos - -halfH * sin);
          const cornerY = cy + (-halfW * sin + -halfH * cos);
          // The control stack pivots about the element corner, which sits 34px
          // (button width + gap) to the right of the stack's own left edge.
          const PIVOT = 34;
          const isImg = el.type === "image_placeholder";
          const btnBase = "flex h-7 w-7 items-center justify-center rounded-md bg-white/90 shadow-md border border-border transition-colors";
          return (
            <div
              style={{
                position: "absolute",
                left: cornerX - PIVOT,
                top: cornerY,
                transformOrigin: `${PIVOT}px 0px`,
                transform: `rotate(${rot}deg)`,
                zIndex: 20,
              }}
              className="flex flex-col gap-1"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Change image (only for image_placeholder elements) */}
              {isImg && onChangeImage && (
                <button
                  type="button"
                  title="Trocar imagem"
                  className={`${btnBase} text-foreground hover:bg-muted`}
                  onClick={(e) => { e.stopPropagation(); onChangeImage(selectedId); }}
                >
                  {/* Swap/refresh icon */}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                </button>
              )}
              {/* Delete */}
              <button
                type="button"
                title="Apagar elemento"
                className={`${btnBase} text-destructive hover:bg-destructive hover:text-white`}
                onClick={(e) => { e.stopPropagation(); removeSelected(); }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          );
        })()}

        {/* Stage is larger than the slide (OX/OY padding on each side) and offset
            so its (OX,OY) origin lines up with the container top-left.
            This lets elements render visually outside the slide boundary. */}
        <Stage
          ref={stageRef}
          width={W + 2 * OX}
          height={H + 2 * OY}
          style={{ position: "absolute", left: -OX, top: -OY }}
          onClick={() => setSelectedId(null)}
          onTap={() => setSelectedId(null)}
        >
          <Layer>
            {/* Slide background — offset to the centre of the oversized stage */}
            <Rect
              name="bg"
              x={OX} y={OY} width={W} height={H}
              fill={slide.backgroundGradient ? undefined : slide.background}
              {...(slide.backgroundGradient ? gradientProps(slide.backgroundGradient, W, H, OX, OY) : {})}
              cornerRadius={12}
              listening={false}
            />

            {/* ── Elements ────────────────────────────────────────────── */}
            {elements.map((el) => {
              const isEditing = editState?.id === el.id;

              /* ── Text ────────────────────────────────────────────────── */
              if (el.type === "text") {
                const t = el as CanvasTextElement;
                // While this element is being live-resized, use the in-flight
                // width/fontSize instead of the committed ones so the content
                // below reflows on every drag tick (see liveTextGeometry).
                const live = liveTextGeometry?.id === el.id ? liveTextGeometry : null;
                const contentWidthPx = (live?.w ?? el.w) * W;
                const contentFontSizePx = (live?.fontSize ?? t.fontSize) * W;
                // Group + hit-rect rather than a bare <Text>: inline markdown
                // needs one Konva node per styled run, so the id, the hit box
                // and the transform attrs live on the wrapper. Same shape as the
                // list branch below, which already goes through the Transformer
                // code path unchanged.
                return (
                  <Group
                    key={el.id}
                    id={el.id}
                    x={el.x * W + OX + el.w * W / 2}
                    y={el.y * H + OY + el.h * H / 2}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    width={el.w * W}
                    height={el.h * H}
                    rotation={el.rotation ?? 0}
                    visible={!isEditing}
                    scooliHalfW={el.w * W / 2}
                    scooliHalfH={el.h * H / 2}
                    {...dragSelectProps(el.id)}
                    onDblClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      e.cancelBubble = true;
                      setSelectedId(el.id);
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, t.text);
                    }}
                    onDblTap={(e: Konva.KonvaEventObject<TouchEvent>) => {
                      e.cancelBubble = true;
                      setSelectedId(el.id);
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, t.text);
                    }}
                    // Change cursor to text-beam on hover so users know it's editable.
                    onMouseEnter={() => {
                      if (!isDraggingRef.current) setStageCursor("grab");
                    }}
                    onMouseLeave={() => {
                      if (!isDraggingRef.current) setStageCursor("default");
                    }}
                  >
                    <Rect
                      width={contentWidthPx}
                      height={el.h * H}
                      fill="transparent"
                      strokeEnabled={false}
                    />
                    <KonvaRichText
                      x={0}
                      y={0}
                      width={contentWidthPx}
                      height={el.h * H}
                      text={t.text}
                      fontSize={contentFontSizePx}
                      fontFamily={t.fontFamily || T.font}
                      bold={t.fontStyle === "bold" || t.fontStyle === "bold italic"}
                      fill={t.color}
                      align={t.align}
                      lineHeight={TEXT_LINE_HEIGHT}
                    />
                  </Group>
                );
              }

              /* ── Bullet / ordered list ──────────────────────────────── */
              if (el.type === "bullet_list" || el.type === "ordered_list") {
                const l = el as CanvasListElement;
                const ordered = el.type === "ordered_list";
                // Same live-reflow override as the "text" branch above.
                const live = liveTextGeometry?.id === el.id ? liveTextGeometry : null;
                const contentWidthPx = (live?.w ?? el.w) * W;
                const contentFontSizePx = (live?.fontSize ?? l.fontSize) * W;
                const itemHeights = measureListItemHeightsPx(l, contentWidthPx, contentFontSizePx);
                let nextY = 0;
                const itemOffsets = itemHeights.map((itemHeight) => {
                  const offset = nextY;
                  nextY += itemHeight;
                  return offset;
                });
                return (
                  <Group
                    key={el.id}
                    id={el.id}
                    x={el.x * W + OX + el.w * W / 2}
                    y={el.y * H + OY + el.h * H / 2}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    rotation={el.rotation ?? 0}
                    visible={!isEditing}
                    scooliHalfW={el.w * W / 2}
                    scooliHalfH={el.h * H / 2}
                    {...dragSelectProps(el.id)}
                    onDblClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      e.cancelBubble = true;
                      setSelectedId(el.id);
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, l.items.join("\n"));
                    }}
                    onDblTap={(e: Konva.KonvaEventObject<TouchEvent>) => {
                      e.cancelBubble = true;
                      setSelectedId(el.id);
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, l.items.join("\n"));
                    }}
                    onMouseEnter={() => {
                      if (!isDraggingRef.current) setStageCursor("text");
                    }}
                    onMouseLeave={() => {
                      if (!isDraggingRef.current) setStageCursor("default");
                    }}
                  >
                    {/* Hit rect gives the Group an explicit bounding box */}
                    <Rect
                      width={contentWidthPx}
                      height={el.h * H}
                      fill="transparent"
                      strokeEnabled={false}
                    />
                    {l.items.map((item, i) => (
                      <KonvaRichText
                        key={i}
                        x={0}
                        y={itemOffsets[i] ?? 0}
                        width={contentWidthPx}
                        height={itemHeights[i] ?? contentFontSizePx * TEXT_LINE_HEIGHT}
                        items={[item]}
                        listType={ordered ? "ordered_list" : "bullet_list"}
                        listStartIndex={i}
                        fontSize={contentFontSizePx}
                        fontFamily={getTextLikeFontFamily(l)}
                        fill={l.color}
                        lineHeight={TEXT_LINE_HEIGHT}
                      />
                    ))}
                  </Group>
                );
              }

              /* ── Math (TeX rendered as italic text) ──────────────────── */
              if (el.type === "math") {
                const m = el as CanvasMathElement;
                const pixelHeight = Math.max(1, Math.round(el.h * H));
                const cacheKey = `${m.tex}__${MATH_COLOR}__${pixelHeight}`;
                const cached = mathCacheRef.current[cacheKey];

                if (cached && cached !== "loading") {
                  // Fit the rendered formula inside the element box while
                  // preserving its natural aspect ratio (no stretching), centred.
                  const boxW = el.w * W;
                  const boxH = el.h * H;
                  const natW = cached.naturalWidth || cached.width || boxW;
                  const natH = cached.naturalHeight || cached.height || boxH;
                  const fit = Math.min(boxW / natW, boxH / natH);
                  const drawW = natW * fit;
                  const drawH = natH * fit;
                  return (
                    <Group
                      key={el.id}
                      id={el.id}
                      x={el.x * W + OX + el.w * W / 2}
                      y={el.y * H + OY + el.h * H / 2}
                      offsetX={el.w * W / 2}
                      offsetY={el.h * H / 2}
                      rotation={el.rotation ?? 0}
                      visible={!isEditing}
                      scooliHalfW={el.w * W / 2}
                      scooliHalfH={el.h * H / 2}
                      {...dragSelectProps(el.id)}
                      onDblClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                        e.cancelBubble = true;
                        setSelectedId(el.id);
                        const node = stageRef.current?.findOne(`#${el.id}`);
                        if (onEditMath) { onEditMath(el.id); } else if (node) startEdit(el.id, node, m.tex);
                      }}
                      onDblTap={(e: Konva.KonvaEventObject<TouchEvent>) => {
                        e.cancelBubble = true;
                        setSelectedId(el.id);
                        const node = stageRef.current?.findOne(`#${el.id}`);
                        if (onEditMath) { onEditMath(el.id); } else if (node) startEdit(el.id, node, m.tex);
                      }}
                      onMouseEnter={() => {
                        if (!isDraggingRef.current) setStageCursor("grab");
                      }}
                      onMouseLeave={() => {
                        if (!isDraggingRef.current) setStageCursor("default");
                      }}
                    >
                      {/* Transparent hit rect so the whole box is selectable */}
                      <Rect width={boxW} height={boxH} fill="transparent" strokeEnabled={false} />
                      <KonvaImage
                        image={cached}
                        x={(boxW - drawW) / 2}
                        y={(boxH - drawH) / 2}
                        width={drawW}
                        height={drawH}
                        listening={false}
                      />
                    </Group>
                  );
                }

                return (
                  <Text
                    key={el.id}
                    id={el.id}
                    x={el.x * W + OX + el.w * W / 2}
                    y={el.y * H + OY + el.h * H / 2}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    rotation={el.rotation ?? 0}
                    text={m.tex}
                    width={el.w * W}
                    height={el.h * H}
                    fontSize={m.fontSize * W}
                    fontFamily={T.font}
                    fontStyle="italic"
                    fill={MATH_COLOR}
                    align="center"
                    lineHeight={1.3}
                    wrap="word"
                    visible={!isEditing}
                    scooliHalfW={el.w * W / 2}
                    scooliHalfH={el.h * H / 2}
                    {...dragSelectProps(el.id)}
                    onDblClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      e.cancelBubble = true;
                      setSelectedId(el.id);
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (onEditMath) { onEditMath(el.id); } else if (node) startEdit(el.id, node, m.tex);
                    }}
                    onDblTap={(e: Konva.KonvaEventObject<TouchEvent>) => {
                      e.cancelBubble = true;
                      setSelectedId(el.id);
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (onEditMath) { onEditMath(el.id); } else if (node) startEdit(el.id, node, m.tex);
                    }}
                    onMouseEnter={() => {
                      if (!isDraggingRef.current) setStageCursor("grab");
                    }}
                    onMouseLeave={() => {
                      if (!isDraggingRef.current) setStageCursor("default");
                    }}
                  />
                );
              }

              /* ── Image placeholder / actual image ───────────────────── */
              if (el.type === "image_placeholder") {
                const img = el as CanvasImageElement;

                // If the element has a URL and it's loaded, render the real image.
                const cached = img.url ? imgCacheRef.current[img.url] : undefined;
                if (cached && cached !== "loading") {
                  // No double-click handler here on purpose: once an image is
                  // generated, double-clicking it used to reopen the raw AI
                  // prompt as an editable text box, which read like a stray
                  // caption on the slide. Changing the image now only happens
                  // through the "Trocar imagem" toolbar button above.
                  return (
                    <KonvaImage
                      key={el.id}
                      id={el.id}
                      image={cached}
                      x={el.x * W + OX + el.w * W / 2}
                      y={el.y * H + OY + el.h * H / 2}
                      offsetX={el.w * W / 2}
                      offsetY={el.h * H / 2}
                      rotation={el.rotation ?? 0}
                      width={el.w * W}
                      height={el.h * H}
                      cornerRadius={6}
                      visible={!isEditing}
                      {...dragSelectProps(el.id)}
                      onMouseEnter={() => {
                        if (!isDraggingRef.current) setStageCursor("grab");
                      }}
                      onMouseLeave={() => {
                        if (!isDraggingRef.current) setStageCursor("default");
                      }}
                    />
                  );
                }

                // Fallback: placeholder box with prompt text. No image exists
                // yet, so double-click here still opens the prompt for editing —
                // that's the only way to set/refine it before generation.
                const dblHandlers = {
                  onDblClick: () => {
                    const node = stageRef.current?.findOne(`#${el.id}`);
                    if (node) startEdit(el.id, node, img.prompt);
                  },
                  onDblTap: () => {
                    const node = stageRef.current?.findOne(`#${el.id}`);
                    if (node) startEdit(el.id, node, img.prompt);
                  },
                };
                const promptFs = Math.max(10, Math.round(el.w * W * 0.035));
                return (
                  <Group
                    key={el.id}
                    id={el.id}
                    x={el.x * W + OX + el.w * W / 2}
                    y={el.y * H + OY + el.h * H / 2}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    rotation={el.rotation ?? 0}
                    visible={!isEditing}
                    {...dragSelectProps(el.id)}
                    {...dblHandlers}
                    onMouseEnter={() => {
                      if (!isDraggingRef.current) setStageCursor("grab");
                    }}
                    onMouseLeave={() => {
                      if (!isDraggingRef.current) setStageCursor("default");
                    }}
                  >
                    <Rect
                      width={el.w * W}
                      height={el.h * H}
                      fill={T.imageBg}
                      stroke={T.imageBorder}
                      strokeWidth={1.5}
                      dash={[6, 4]}
                      cornerRadius={8}
                    />
                    {/* Camera icon approximation */}
                    <Rect
                      x={el.w * W / 2 - promptFs}
                      y={el.h * H * 0.25}
                      width={promptFs * 2}
                      height={promptFs * 1.4}
                      fill={T.muted}
                      cornerRadius={3}
                      opacity={0.4}
                      listening={false}
                    />
                    <Text
                      text={img.url && cached === "loading" ? "A carregar imagem…" : (img.prompt || "Duplo-clique para editar descrição")}
                      x={el.w * W * 0.08}
                      y={el.h * H * 0.55}
                      width={el.w * W * 0.84}
                      fontSize={promptFs}
                      fontFamily={T.font}
                      fill={T.muted}
                      align="center"
                        wrap="word"
                        listening={false}
                      />
                  </Group>
                );
              }

              if (el.type === "shape") {
                const shape = el as CanvasShapeElement;
                const fill = shape.fill ?? SHAPE_FILL;
                const stroke = shape.stroke ?? SHAPE_STROKE;
                const rawSW = shape.strokeWidth ?? SHAPE_STROKE_WIDTH;
                const strokeWidth = rawSW === 0 ? 0 : Math.max(1, rawSW * W);
                const centerX = el.x * W + OX + (el.w * W) / 2;
                const centerY = el.y * H + OY + (el.h * H) / 2;

                if (shape.shape === "rect") {
                  return (
                    <Rect
                      key={el.id}
                      id={el.id}
                      x={centerX}
                      y={centerY}
                      offsetX={el.w * W / 2}
                      offsetY={el.h * H / 2}
                      rotation={el.rotation ?? 0}
                      width={el.w * W}
                      height={el.h * H}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      scooliHalfW={el.w * W / 2}
                      scooliHalfH={el.h * H / 2}
                      cornerRadius={shape.cornerRadius ?? 8}
                      {...(shape.isDecoration ? {} : dragSelectProps(el.id))}
                      onMouseEnter={() => {
                        if (!isDraggingRef.current) setStageCursor("grab");
                      }}
                      onMouseLeave={() => {
                        if (!isDraggingRef.current) setStageCursor("default");
                      }}
                    />
                  );
                }

                if (shape.shape === "ellipse") {
                  return (
                    <Ellipse
                      key={el.id}
                      id={el.id}
                      x={centerX}
                      y={centerY}
                      rotation={el.rotation ?? 0}
                      radiusX={el.w * W / 2}
                      radiusY={el.h * H / 2}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      scooliHalfW={el.w * W / 2}
                      scooliHalfH={el.h * H / 2}
                      {...dragSelectProps(el.id)}
                      onMouseEnter={() => {
                        if (!isDraggingRef.current) setStageCursor("grab");
                      }}
                      onMouseLeave={() => {
                        if (!isDraggingRef.current) setStageCursor("default");
                      }}
                    />
                  );
                }

                return (
                  <Line
                    key={el.id}
                    id={el.id}
                    x={centerX}
                    y={centerY}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    rotation={el.rotation ?? 0}
                    points={[0, el.h * H / 2, el.w * W, el.h * H / 2]}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    scooliHalfW={el.w * W / 2}
                    scooliHalfH={el.h * H / 2}
                    hitStrokeWidth={Math.max(strokeWidth + 10, el.h * H)}
                    lineCap="round"
                    {...dragSelectProps(el.id)}
                    onMouseEnter={() => {
                      if (!isDraggingRef.current) setStageCursor("grab");
                    }}
                    onMouseLeave={() => {
                      if (!isDraggingRef.current) setStageCursor("default");
                    }}
                  />
                );
              }

              return null;
            })}

            {/* ── Snap alignment guides ───────────────────────────────── */}
            {guides.vLines.map((x, i) => (
              <Line
                key={`vg${i}`}
                points={[x, -10, x, H + 10]}
                stroke={T.primary}
                strokeWidth={1}
                dash={[4, 3]}
                opacity={0.75}
                listening={false}
              />
            ))}
            {guides.hLines.map((y, i) => (
              <Line
                key={`hg${i}`}
                points={[-10, y, W + 10, y]}
                stroke={T.primary}
                strokeWidth={1}
                dash={[4, 3]}
                opacity={0.75}
                listening={false}
              />
            ))}

            {/* ── Single Transformer for all elements ─────────────────── */}
            <Transformer
              ref={trRef}
              rotateEnabled={true}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={6}
              keepRatio={false}
              centeredScaling={false}
              borderStroke={T.selection}
              borderStrokeWidth={1.5}
              borderDash={[4, 3]}
              anchorStroke={T.selection}
              anchorFill={T.bg}
              anchorStrokeWidth={1.5}
              anchorSize={8}
              anchorCornerRadius={2}
              padding={4}
              boundBoxFunc={(oldBox, newBox) => {
                // Only enforce a minimum size — elements are free to overlap the
                // slide boundary (Konva clips at canvas edges).
                if (newBox.width < 20 || newBox.height < 10) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>

        {/* Floating WYSIWYG overlay for active text/list edit — see EditState.kind */}
        {editState?.kind === "text" && (
          <RichTextEditOverlay edit={editState} onCommit={commitEdit} />
        )}
        {editState?.kind === "list" && (
          <RichListEditOverlay edit={editState} onCommit={commitEdit} />
        )}
        {editState?.kind === "plain" && (
          <PlainTextEditOverlay edit={editState} onCommit={commitEdit} />
        )}
      </div>
    </div>
  );
});
