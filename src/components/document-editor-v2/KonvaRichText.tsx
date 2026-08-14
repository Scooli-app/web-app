"use client";

/**
 * KonvaRichText — inline-markdown-aware text for the slide canvas.
 *
 * Konva's `<Text>` paints one font per node, so passing it `"**Erosão**: ..."`
 * draws the asterisks literally. This component parses the limited-Markdown
 * grammar into styled runs, lays them out with real per-run metrics, and emits
 * one `<Text>` per positioned segment.
 *
 * Used by all three canvas surfaces (editor, thumbnails, presenter) so a deck
 * looks the same everywhere.
 *
 * Layout notes:
 *   - Wrapping is greedy word-wrap measured with the SAME font string Konva
 *     will paint with, via a shared offscreen 2D context.
 *   - List items get a hanging indent: wrapped lines align to the text, not
 *     under the marker.
 *   - Web fonts change metrics when they finish loading, so the component
 *     re-lays-out once `document.fonts.ready` resolves.
 */

import {
  listMarkerFor,
  normalizeListItem,
  parseInlineRuns,
  type InlineRun,
} from "@/shared/utils/inline-markdown";
import { useEffect, useMemo, useState } from "react";
import { Group, Text } from "react-konva";

const MONO_FAMILY = "ui-monospace, SFMono-Regular, Menlo, monospace";

/* -------------------------------------------------------------------------- */
/* Measurement                                                                 */
/* -------------------------------------------------------------------------- */

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === "undefined") return null;
  measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
}

/** Font shorthand matching what Konva builds from fontStyle/fontSize/fontFamily. */
function fontString(run: InlineRun, fontSize: number, fontFamily: string): string {
  const style = run.italic ? "italic " : "";
  const weight = run.bold ? "bold " : "";
  const family = run.code ? MONO_FAMILY : fontFamily;
  return `${style}${weight}${fontSize}px ${family}`;
}

function measure(text: string, run: InlineRun, fontSize: number, fontFamily: string): number {
  const ctx = getMeasureContext();
  if (!ctx) {
    // SSR / no canvas: approximate so the tree still renders something sane.
    return text.length * fontSize * 0.5;
  }
  ctx.font = fontString(run, fontSize, fontFamily);
  return ctx.measureText(text).width;
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

/** One run fragment placed at an absolute offset inside the text box. */
export interface PlacedSegment {
  text: string;
  run: InlineRun;
  x: number;
  y: number;
}

interface LayoutInput {
  /** Logical lines. Each is laid out independently and may wrap into several. */
  lines: Array<{ marker?: string; text: string }>;
  width: number;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  align: "left" | "center" | "right";
  /** Applied on top of whatever the markdown asks for (e.g. a bold title). */
  baseBold?: boolean;
}

/**
 * Greedy word-wrap over styled runs. Returns absolute-positioned segments plus
 * the total height consumed, so callers can vertically centre or clip.
 */
export function layout(input: LayoutInput): { segments: PlacedSegment[]; height: number } {
  const { lines, width, fontSize, fontFamily, lineHeight, align, baseBold } = input;
  const step = fontSize * lineHeight;
  const segments: PlacedSegment[] = [];
  let y = 0;

  for (const line of lines) {
    const runs = parseInlineRuns(line.text).map((r) => ({
      ...r,
      bold: r.bold || Boolean(baseBold),
    }));

    const markerRun: InlineRun = { text: "", bold: Boolean(baseBold), italic: false, code: false };
    const indent = line.marker ? measure(line.marker, markerRun, fontSize, fontFamily) : 0;

    // Current visual line being assembled.
    let current: PlacedSegment[] = [];
    let cursor = indent;
    let isFirstVisualLine = true;

    const flushLine = () => {
      if (current.length === 0 && !(isFirstVisualLine && line.marker)) {
        y += step;
        return;
      }
      const lineWidth = cursor;
      // `align` shifts the whole assembled line. Left is the common case and
      // needs no adjustment; the marker keeps its hanging indent either way.
      const shift =
        align === "center"
          ? Math.max(0, (width - lineWidth) / 2)
          : align === "right"
            ? Math.max(0, width - lineWidth)
            : 0;

      if (isFirstVisualLine && line.marker) {
        segments.push({ text: line.marker, run: markerRun, x: shift, y });
      }
      for (const seg of current) {
        segments.push({ ...seg, x: seg.x + shift, y });
      }
      current = [];
      cursor = indent;
      y += step;
      isFirstVisualLine = false;
    };

    for (const run of runs) {
      // Split on explicit newlines first, then on spaces. Keeping the spaces
      // attached to the preceding word means trailing space never starts a line.
      const paragraphs = run.text.split("\n");

      paragraphs.forEach((paragraph, pIdx) => {
        if (pIdx > 0) flushLine();
        if (paragraph.length === 0) return;

        const words = paragraph.match(/\S+\s*|\s+/g) ?? [];
        for (const word of words) {
          const wordWidth = measure(word, run, fontSize, fontFamily);
          const trimmedWidth = measure(word.trimEnd(), run, fontSize, fontFamily);

          // Wrap when the visible part of the word overflows, but never on a
          // line that has nothing on it yet (a single over-long word must be
          // allowed to overflow rather than loop forever).
          if (cursor + trimmedWidth > width && cursor > indent) {
            flushLine();
            if (word.trimStart().length === 0) continue; // don't start a line with a space
          }

          const text = cursor === indent ? word.trimStart() : word;
          if (text.length === 0) continue;
          const w = cursor === indent ? measure(text, run, fontSize, fontFamily) : wordWidth;

          current.push({ text, run, x: cursor, y: 0 });
          cursor += w;
        }
      });
    }

    flushLine();
  }

  return { segments, height: y };
}

/**
 * Input for {@link measureRichTextHeight} — the same shape {@link KonvaRichText}
 * itself accepts for `text`/`items`, minus the purely-visual props (fill,
 * align, position) that don't affect how many lines the content wraps into.
 */
export interface RichTextMeasureInput {
  text?: string;
  items?: string[];
  listType?: "bullet_list" | "ordered_list";
  listStartIndex?: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  lineHeight?: number;
  bold?: boolean;
}

/**
 * The height (in px) {@link KonvaRichText} will actually render at for this
 * content and box width — same word-wrap, same per-run bold/italic glyph
 * widths, same hanging indent on wrapped list lines.
 *
 * Callers that need to know a text/list box's height WITHOUT rendering it
 * (auto-fit after an edit, live-resize preview, initial layout) must go
 * through this rather than a plain single-style measurement: a plain probe
 * ignores that bold runs are wider than plain text and that wrapped
 * continuation lines have less width available (the hanging indent), so it
 * under-counts wrapped lines and the box ends up too short — text overlaps
 * whatever comes after it.
 */
export function measureRichTextHeight(input: RichTextMeasureInput): number {
  const lines = input.items
    ? input.items.map((item, i) => ({
        marker: listMarkerFor(input.listType ?? "bullet_list", (input.listStartIndex ?? 0) + i),
        text: normalizeListItem(item),
      }))
    : [{ text: input.text ?? "" }];

  return layout({
    lines,
    width: input.width,
    fontSize: input.fontSize,
    fontFamily: input.fontFamily,
    lineHeight: input.lineHeight ?? 1.3,
    align: "left", // height doesn't depend on alignment
    baseBold: input.bold,
  }).height;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

/** Re-render once web fonts settle, so measured widths match painted widths. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(() =>
    typeof document === "undefined" ? true : document.fonts?.status === "loaded",
  );
  useEffect(() => {
    if (ready || typeof document === "undefined" || !document.fonts) return;
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return ready;
}

export interface KonvaRichTextProps {
  /** Box origin and size, in pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  /** Force bold on every run (titles, headings). */
  bold?: boolean;
  /** Vertically centre the laid-out block inside `height`. */
  verticalCenter?: boolean;
  /** Plain text (may contain `\n`). Mutually exclusive with `items`. */
  text?: string;
  /** List items — markers are added here, never expected in the item text. */
  items?: string[];
  listType?: "bullet_list" | "ordered_list";
  /**
   * Number the first item as if it were at this index. The editor lays out one
   * item per node so it can position them individually; without this every
   * ordered item would render as "1.".
   */
  listStartIndex?: number;
}

export function KonvaRichText({
  x,
  y,
  width,
  height,
  rotation = 0,
  fontSize,
  fontFamily,
  fill,
  align = "left",
  lineHeight = 1.3,
  bold = false,
  verticalCenter = false,
  text,
  items,
  listType = "bullet_list",
  listStartIndex = 0,
}: KonvaRichTextProps) {
  const fontsReady = useFontsReady();

  const { segments, height: contentHeight } = useMemo(() => {
    const lines = items
      ? items.map((item, i) => ({
          marker: listMarkerFor(listType, listStartIndex + i),
          text: normalizeListItem(item),
        }))
      : [{ text: text ?? "" }];

    return layout({
      lines,
      width,
      fontSize,
      fontFamily,
      lineHeight,
      align,
      baseBold: bold,
    });
    // `fontsReady` is a dependency on purpose even though it isn't read in the
    // body: `measure()` reads live metrics off a shared canvas context, and the
    // fallback family's widths differ from the web font's. Without it the first
    // layout sticks and the text wraps at the wrong place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    listType,
    listStartIndex,
    text,
    width,
    fontSize,
    fontFamily,
    lineHeight,
    align,
    bold,
    fontsReady,
  ]);

  const originY = verticalCenter ? Math.max(0, (height - contentHeight) / 2) : 0;
  // Konva paints text from the top of the em box; nudging by the leading gap
  // keeps the first baseline where a plain <Text> would have put it.
  const leading = (fontSize * lineHeight - fontSize) / 2;

  return (
    // Rotation belongs on the group, about the box centre — rotating each
    // segment about its own origin would fan them apart.
    <Group
      x={x + width / 2}
      y={y + height / 2}
      offsetX={width / 2}
      offsetY={height / 2}
      rotation={rotation}
      listening={false}
    >
      {segments.map((seg, i) => (
        <Text
          key={i}
          x={seg.x}
          y={originY + seg.y + leading}
          text={seg.text}
          fontSize={fontSize}
          fontFamily={seg.run.code ? MONO_FAMILY : fontFamily}
          fontStyle={
            seg.run.bold && seg.run.italic
              ? "italic bold"
              : seg.run.bold
                ? "bold"
                : seg.run.italic
                  ? "italic"
                  : "normal"
          }
          fill={fill}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </Group>
  );
}
