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
import { Group, Layer, Rect, Stage, Text, Transformer } from "react-konva";

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
 * Text formatting helpers
 * -------------------------------------------------------------------------- */

type FontStyle = CanvasTextElement["fontStyle"];

function toggleBold(s: FontStyle): FontStyle {
  if (s === "bold") return "normal";
  if (s === "bold italic") return "italic";
  if (s === "italic") return "bold italic";
  return "bold";
}

function toggleItalic(s: FontStyle): FontStyle {
  if (s === "italic") return "normal";
  if (s === "bold italic") return "bold";
  if (s === "bold") return "bold italic";
  return "italic";
}

const COLOR_PRESETS: { color: string; label: string }[] = [
  { color: "#ffffff", label: "Branco" },
  { color: "#9ca3af", label: "Cinzento" },
  { color: "#1e293b", label: "Azul-escuro" },
  { color: "#6753FF", label: "Violeta" },
  { color: "#3b82f6", label: "Azul" },
  { color: "#06b6d4", label: "Ciano" },
  { color: "#4ade80", label: "Verde" },
  { color: "#fbbf24", label: "Âmbar" },
  { color: "#f97316", label: "Laranja" },
  { color: "#f43f5e", label: "Vermelho" },
  { color: "#ec4899", label: "Rosa" },
  { color: "#a855f7", label: "Roxo" },
];

/* --------------------------------------------------------------------------
 * useStageSize — responsive 16:9 canvas.
 * -------------------------------------------------------------------------- */
function useStageSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ W: 900, H: 506 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setSize({ W: w, H: Math.round(w * (9 / 16)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

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
  color: string;
  multiline: boolean;
}

function TextEditOverlay({
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
    el.select();
  }, [edit.id]);

  const commit = () => onCommit(edit.id, ref.current?.value ?? edit.value);

  return (
    <textarea
      ref={ref}
      defaultValue={edit.value}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          commit();
        }
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
        minHeight: edit.height,
        fontSize: edit.fontSize,
        fontFamily: T.font,
        color: edit.color,
        background: "rgba(103,83,255,0.10)",
        border: `2px solid ${T.selection}`,
        borderRadius: 4,
        outline: "none",
        resize: "none",
        padding: "2px 4px",
        lineHeight: 1.3,
        boxSizing: "border-box",
        zIndex: 10,
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
  }
>(function SlideKonvaEditor({ slide, onChange, onSelectionChange }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const { W, H } = useStageSize(containerRef);

  const elements = slide.elements;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  /* ── Notify parent when selection changes ──────────────────────────────── */
  useEffect(() => {
    onSelectionChange?.(selectedId);
  }, [selectedId, onSelectionChange]);

  /* ── Transformer — attach to selected node ─────────────────────────────── */
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node as Konva.Node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements]);

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

  const handleDragEnd = useCallback(
    (id: string, node: Konva.Node) => {
      updateElement(id, { x: node.x() / W, y: node.y() / H });
    },
    [W, H, updateElement],
  );

  /**
   * After Transformer resize: reset scale to 1 and update fractional w/h.
   * We use el.w * scaleX / 1 instead of node.width() * scaleX / W to avoid
   * Group bounding-box inconsistencies.
   */
  const handleTransformEnd = useCallback(
    (id: string, node: Konva.Node) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      node.getLayer()?.batchDraw();
      updateElement(id, {
        x: node.x() / W,
        y: node.y() / H,
        w: Math.max(0.05, el.w * sx),
        h: Math.max(0.02, el.h * sy),
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

      setSelectedId(null); // clear transformer while editing
      setEditState({
        id,
        value,
        x: absPos.x,
        y: absPos.y,
        width: el.w * W,
        height: Math.max(el.h * H, fs * 1.5),
        fontSize: fs,
        color,
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
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      handleDragEnd(id, e.target),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
      handleTransformEnd(id, e.target),
  });

  /* ── Derived: selected text element (for formatting toolbar) ──────────── */
  const selectedTextEl =
    selectedId != null
      ? (elements.find(
          (e): e is CanvasTextElement =>
            e.id === selectedId && e.type === "text",
        ) ?? null)
      : null;

  const selectedListEl =
    selectedId != null
      ? (elements.find(
          (e): e is CanvasListElement =>
            e.id === selectedId &&
            (e.type === "bullet_list" || e.type === "ordered_list"),
        ) ?? null)
      : null;

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col">
      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full select-none overflow-hidden rounded-xl"
      >
        <Stage
          ref={stageRef}
          width={W}
          height={H}
          onClick={() => setSelectedId(null)}
          onTap={() => setSelectedId(null)}
        >
          <Layer>
            {/* Slide background */}
            <Rect
              name="bg"
              x={0} y={0} width={W} height={H}
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
                    x={el.x * W}
                    y={el.y * H}
                    text={t.text}
                    width={el.w * W}
                    height={el.h * H}
                    fontSize={t.fontSize * W}
                    fontFamily={T.font}
                    fontStyle={t.fontStyle}
                    fill={t.color}
                    align={t.align}
                    lineHeight={1.3}
                    wrap="word"
                    visible={!isEditing}
                    {...dragSelectProps(el.id)}
                    onDblClick={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, t.text);
                    }}
                    onDblTap={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, t.text);
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
                    x={el.x * W}
                    y={el.y * H}
                    visible={!isEditing}
                    {...dragSelectProps(el.id)}
                    onDblClick={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, l.items.join("\n"), true);
                    }}
                    onDblTap={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, l.items.join("\n"), true);
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
                    x={el.x * W}
                    y={el.y * H}
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

              /* ── Image placeholder ──────────────────────────────────── */
              if (el.type === "image_placeholder") {
                const img = el as CanvasImageElement;
                const promptFs = Math.max(10, Math.round(el.w * W * 0.035));
                return (
                  <Group
                    key={el.id}
                    id={el.id}
                    x={el.x * W}
                    y={el.y * H}
                    {...dragSelectProps(el.id)}
                    onDblClick={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, img.prompt);
                    }}
                    onDblTap={() => {
                      const node = stageRef.current?.findOne(`#${el.id}`);
                      if (node) startEdit(el.id, node, img.prompt);
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
                      text={img.prompt || "Duplo-clique para editar descrição"}
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

            {/* ── Single Transformer for all elements ─────────────────── */}
            <Transformer
              ref={trRef}
              rotateEnabled={false}
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
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 20 || newBox.height < 10 ? oldBox : newBox
              }
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
