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
  CanvasImageElement,
  CanvasListElement,
  CanvasMathElement,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import type Konva from "konva";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";

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
 * TextEditOverlay — floating textarea positioned over the canvas element.
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
  multiline: boolean;
}

/**
 * TextEditOverlay — an invisible textarea that sits exactly over the hidden
 * Konva Text node so editing feels inline.  Key improvements over the old
 * purple-tinted approach:
 *
 *   • Transparent background — slide content shows through.
 *   • Matches font weight/style so bold/italic look correct while editing.
 *   • Cursor placed at end (not select-all) on open.
 *   • Auto-resizes height as the user types.
 *   • Subtle focus ring instead of a coloured border.
 */
function TextEditOverlay({
  edit,
  onCommit,
}: {
  edit: EditState;
  onCommit: (id: string, value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Split Konva's combined fontStyle string into CSS fontWeight + fontStyle.
  const isBold   = edit.fontStyle?.includes("bold")   ?? false;
  const isItalic = edit.fontStyle?.includes("italic") ?? false;

  // Focus + cursor-at-end + initial auto-size on mount / element change.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
    // Size to content immediately so the textarea matches the Konva element.
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, edit.height)}px`;
  }, [edit.id, edit.height]);

  // Grow/shrink textarea as the user types.
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
        if (e.key === "Enter" && !e.shiftKey && !edit.multiline) {
          e.preventDefault();
          commit();
        }
      }}
      style={{
        position: "absolute",
        left: edit.x,
        top: edit.y,
        width: edit.width,
        height: edit.height,     // initial; overridden by autoResize
        fontSize: edit.fontSize,
        fontFamily: edit.fontFamily ?? T.font,
        fontWeight: isBold ? "bold" : "normal",
        fontStyle: isItalic ? "italic" : "normal",
        color: edit.color,
        caretColor: edit.color,
        textAlign: edit.align ?? "left",
        lineHeight: 1.3,
        // Invisible — looks like directly editing the canvas text.
        background: "transparent",
        border: "none",
        outline: "none",
        boxShadow: `0 0 0 2px ${T.selection}55`,  // translucent focus ring
        borderRadius: 4,
        padding: 0,
        resize: "none",
        boxSizing: "border-box",
        zIndex: 10,
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
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
  }
>(function SlideKonvaEditor({ slide, onChange, onSelectionChange, onChangeImage }, ref) {
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
  /**
   * Live position of the selected node while dragging/transforming.
   * Updated on every onDragMove / onTransform tick so overlay buttons
   * follow the element in real-time (like Teachy). Cleared on pointer-up.
   */
  const [livePos, setLivePos] = useState<{
    cx: number; cy: number; halfW: number; halfH: number; rotation: number;
  } | null>(null);

  // Clear live position whenever selection changes.
  useEffect(() => { setLivePos(null); }, [selectedId]);

  /* ── Image URL cache: url → loaded HTMLImageElement ────────────────────── */
  // We use a ref as the cache store (avoids re-renders during load) and a
  // counter state to trigger a redraw once each image finishes loading.
  const imgCacheRef = useRef<Record<string, HTMLImageElement | "loading">>({});
  const [imgRevision, setImgRevision] = useState(0);

  useEffect(() => {
    let changed = false;
    for (const el of elements) {
      if (el.type !== "image_placeholder") continue;
      const img = el as CanvasImageElement;
      if (!img.url || img.url in imgCacheRef.current) continue;
      imgCacheRef.current[img.url] = "loading";
      changed = true;
      const i = new window.Image();
      i.crossOrigin = "anonymous";
      i.onload = () => {
        imgCacheRef.current[img.url!] = i;
        setImgRevision((r) => r + 1); // trigger re-render
      };
      i.onerror = () => {
        // Remove from cache so a retry is possible
        delete imgCacheRef.current[img.url!];
      };
      i.src = img.url;
    }
    if (changed) setImgRevision((r) => r + 1); // repaint while loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

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
        onChange(elements.filter((el) => el.id !== selectedId));
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

  /**
   * Snaps the node to nearby alignment lines during drag and draws guide lines.
   * Checks left/center/right and top/center/bottom edges of the dragged element
   * against stage boundaries, stage centre, and all other elements' edges.
   */
  const handleDragMove = useCallback(
    (id: string, node: Konva.Node) => {
      const THRESH = 6;
      const hw = node.offsetX(); // half pixel width (offsetX = w*W/2)
      const hh = node.offsetY(); // half pixel height
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
    [W, H, elements],
  );

  const handleDragEnd = useCallback(
    (id: string, node: Konva.Node) => {
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
    [W, H, elements, updateElement],
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
      setLivePos({
        cx: node.x() - OX,  // container space
        cy: node.y() - OY,
        halfW: el.w * W / 2 * Math.abs(node.scaleX()),
        halfH: el.h * H / 2 * Math.abs(node.scaleY()),
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
    [W, H, elements],
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
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const sx = node.scaleX();
      const sy = node.scaleY();
      const newW = Math.max(0.05, el.w * Math.abs(sx));
      const newH = Math.max(0.02, el.h * Math.abs(sy));
      const cx = node.x(); // center x in pixels
      const cy = node.y(); // center y in pixels
      // Reset scale and update offset so the pivot matches the new size
      node.scaleX(1);
      node.scaleY(1);
      node.offsetX(newW * W / 2);
      node.offsetY(newH * H / 2);
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
        rotation: node.rotation(),
      });
    },
    [W, H, elements, updateElement],
  );

  const startEdit = useCallback(
    (
      id: string,
      node: Konva.Node,
      value: string,
      multiline = false,
    ) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const absPos = node.getAbsolutePosition();
      const fs =
        el.type === "text" ? (el as CanvasTextElement).fontSize * W
        : el.type === "bullet_list" || el.type === "ordered_list"
          ? (el as CanvasListElement).fontSize * W
        : el.type === "math" ? (el as CanvasMathElement).fontSize * W
        : FS_BASE * W;
      const color =
        el.type === "text" ? (el as CanvasTextElement).color
        : el.type === "math" ? T.primary
        : T.muted;
      const fontFamily =
        el.type === "text" ? (el as CanvasTextElement).fontFamily : undefined;
      const fontStyle =
        el.type === "text" ? (el as CanvasTextElement).fontStyle : undefined;
      const align =
        el.type === "text" ? (el as CanvasTextElement).align : undefined;

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
        multiline,
      });
    },
    [elements, W, H],
  );

  const commitEdit = useCallback(
    (id: string, raw: string) => {
      setEditState(null);
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      if (el.type === "text") {
        updateElement(id, { text: raw } as Partial<CanvasTextElement>);
      } else if (el.type === "bullet_list" || el.type === "ordered_list") {
        const items = raw.split("\n").map((s) => s.trim()).filter(Boolean);
        updateElement(id, {
          items: items.length > 0 ? items : [""],
        } as Partial<CanvasListElement>);
      } else if (el.type === "math") {
        updateElement(id, { tex: raw } as Partial<CanvasMathElement>);
      } else if (el.type === "image_placeholder") {
        updateElement(id, { prompt: raw } as Partial<CanvasImageElement>);
      }
    },
    [elements, updateElement],
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
    onChange(elements.filter((e) => e.id !== selectedId));
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
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      handleDragEnd(id, e.target),
    onTransform: (e: Konva.KonvaEventObject<Event>) =>
      handleTransformLive(id, e.target),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
      handleTransformEnd(id, e.target),
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
              fill={slide.background}
              cornerRadius={12}
              listening={false}
            />

            {/* ── Elements ────────────────────────────────────────────── */}
            {elements.map((el) => {
              const isEditing = editState?.id === el.id;

              /* ── Text ────────────────────────────────────────────────── */
              if (el.type === "text") {
                const t = el as CanvasTextElement;
                return (
                  <Text
                    key={el.id}
                    id={el.id}
                    x={el.x * W + OX + el.w * W / 2}
                    y={el.y * H + OY + el.h * H / 2}
                    offsetX={el.w * W / 2}
                    offsetY={el.h * H / 2}
                    rotation={el.rotation ?? 0}
                    text={t.text}
                    width={el.w * W}
                    height={el.h * H}
                    fontSize={t.fontSize * W}
                    fontFamily={t.fontFamily || T.font}
                    fontStyle={t.fontStyle}
                    textDecoration={t.underline ? "underline" : ""}
                    fill={t.color}
                    align={t.align}
                    lineHeight={1.3}
                    wrap="word"
                    visible={!isEditing}
                    {...dragSelectProps(el.id)}
                    // Click on an already-selected text element enters edit mode
                    // immediately (same as Teachy: 1st click = select, 2nd = edit).
                    onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      e.cancelBubble = true;
                      if (editState?.id === el.id) return;
                      if (selectedId === el.id) {
                        const node = stageRef.current?.findOne(`#${el.id}`);
                        if (node) startEdit(el.id, node, t.text);
                      } else {
                        setSelectedId(el.id);
                      }
                    }}
                    onDblClick={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, t.text);
                    }}
                    onDblTap={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, t.text);
                    }}
                    // Change cursor to text-beam on hover so users know it's editable.
                    onMouseEnter={() => {
                      if (stageRef.current) stageRef.current.container().style.cursor = "text";
                    }}
                    onMouseLeave={() => {
                      if (stageRef.current) stageRef.current.container().style.cursor = "default";
                    }}
                  />
                );
              }

              /* ── Bullet / ordered list ──────────────────────────────── */
              if (el.type === "bullet_list" || el.type === "ordered_list") {
                const l = el as CanvasListElement;
                const itemH = Math.max(20, (el.h * H) / Math.max(1, l.items.length));
                const ordered = el.type === "ordered_list";
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
                    onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
                      e.cancelBubble = true;
                      if (editState?.id === el.id) return;
                      if (selectedId === el.id) {
                        const node = stageRef.current?.findOne(`#${el.id}`);
                        if (node) startEdit(el.id, node, l.items.join("\n"), true);
                      } else {
                        setSelectedId(el.id);
                      }
                    }}
                    onDblClick={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, l.items.join("\n"), true);
                    }}
                    onDblTap={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, l.items.join("\n"), true);
                    }}
                    onMouseEnter={() => {
                      if (stageRef.current) stageRef.current.container().style.cursor = "text";
                    }}
                    onMouseLeave={() => {
                      if (stageRef.current) stageRef.current.container().style.cursor = "default";
                    }}
                  >
                    {/* Hit rect gives the Group an explicit bounding box */}
                    <Rect
                      width={el.w * W}
                      height={el.h * H}
                      fill="transparent"
                      strokeEnabled={false}
                    />
                    {l.items.map((item, i) => (
                      <Text
                        key={i}
                        text={ordered ? `${i + 1}. ${item}` : `• ${item}`}
                        x={0}
                        y={i * itemH}
                        width={el.w * W}
                        height={itemH}
                        fontSize={l.fontSize * W}
                        fontFamily={T.font}
                        fill={l.color}
                        lineHeight={1.3}
                        wrap="word"
                        listening={false}
                      />
                    ))}
                  </Group>
                );
              }

              /* ── Math (TeX rendered as italic text) ──────────────────── */
              if (el.type === "math") {
                const m = el as CanvasMathElement;
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
                    fill={T.primary}
                    align="center"
                    lineHeight={1.3}
                    wrap="word"
                    visible={!isEditing}
                    {...dragSelectProps(el.id)}
                    onDblClick={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, m.tex);
                    }}
                    onDblTap={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, m.tex);
                    }}
                  />
                );
              }

              /* ── Image placeholder / actual image ───────────────────── */
              if (el.type === "image_placeholder") {
                const img = el as CanvasImageElement;
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

                // If the element has a URL and it's loaded, render the real image.
                const cached = img.url ? imgCacheRef.current[img.url] : undefined;
                if (cached && cached !== "loading") {
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
                      {...dblHandlers}
                    />
                  );
                }

                // Fallback: placeholder box with prompt text
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

        {/* Floating textarea overlay for active text edit */}
        {editState && (
          <TextEditOverlay edit={editState} onCommit={commitEdit} />
        )}
      </div>
    </div>
  );
});
