/**
 * Inline maths inside slide text (`… $\frac{2}{4}$ …`). Konva text and the
 * native PPTX/PDF text cannot mix in formulas, so text that carries `$…$` is
 * laid out here word by word with each formula drawn as an image. The editor,
 * present mode, thumbnails and both exports share this one layout.
 */
import { renderInlineKatexToPngDataUrl } from "./math-render";

/** `raw`: the formula as written (`$…$` or `$$…$$`), so text the teacher didn't touch is saved back unchanged. */
export type InlineSegment = { kind: "text"; text: string } | { kind: "math"; tex: string; raw: string };

// `$$…$$`, or `$…$` that does not open or close on a space and is not followed by a digit,
// so prices ("custa $5 e $6") stay text.
const INLINE_MATH = /\$\$([^$]+?)\$\$|\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g;

export function hasInlineMath(text: string | undefined): boolean {
  // search() leaves lastIndex alone, which matchAll in splitInlineMath starts from
  return !!text && text.search(INLINE_MATH) !== -1;
}

export function splitInlineMath(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_MATH)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "math", tex: (m[1] ?? m[2]).trim(), raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** Formula number `index` in `text`, or undefined. */
export function inlineMathTex(text: string, index: number): string | undefined {
  return splitInlineMath(text).filter((s) => s.kind === "math")[index]?.tex;
}

/** `text` with formula number `index` replaced by `tex`, written back as `$…$`. */
export function replaceInlineMath(text: string, index: number, tex: string): string {
  let n = 0;
  return text.replace(INLINE_MATH, (whole) => (n++ === index ? `$${tex}$` : whole));
}

export type LaidItem =
  | { kind: "text"; x: number; text: string }
  | { kind: "math"; x: number; tex: string; width: number; height: number; index: number };
export interface LaidLine {
  items: LaidItem[];
  width: number;
  height: number;
}

/**
 * Greedy word wrap of text and formulas into lines of `maxWidth`. Each `\n`
 * starts a new line; a line grows taller than `lineHeightPx` only when a
 * formula needs it. `mathSize` is null while a formula is still rendering.
 */
export function layoutInlineMath(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  mathSize: (tex: string) => { width: number; height: number } | null,
  lineHeightPx: number,
): LaidLine[] {
  const lines: LaidLine[] = [];
  let formula = 0;
  for (const paragraph of text.split("\n")) {
    let line: LaidLine = { items: [], width: 0, height: lineHeightPx };
    const place = (item: LaidItem, w: number, h: number) => {
      line.items.push(item);
      line.width += w;
      line.height = Math.max(line.height, h);
    };
    const breakLine = () => {
      // drop the trailing space so alignment measures the visible text
      const tail = line.items.at(-1);
      if (tail?.kind === "text" && !tail.text.trim()) {
        line.items.pop();
        line.width = tail.x;
      }
      lines.push(line);
      line = { items: [], width: 0, height: lineHeightPx };
    };
    for (const seg of splitInlineMath(paragraph)) {
      if (seg.kind === "math") {
        // shortcut: a formula is never split, even when wider than the box
        const size = mathSize(seg.tex) ?? { width: measure(seg.tex) * 0.6, height: lineHeightPx };
        if (line.items.length > 0 && line.width + size.width > maxWidth) breakLine();
        place({ kind: "math", x: line.width, tex: seg.tex, ...size, index: formula++ }, size.width, size.height);
        continue;
      }
      for (const token of seg.text.split(/(\s+)/)) {
        if (!token) continue;
        const space = !token.trim();
        if (space && line.items.length === 0) continue;
        const w = measure(token);
        if (!space && line.items.length > 0 && line.width + w > maxWidth) breakLine();
        place({ kind: "text", x: line.width, text: token }, w, lineHeightPx);
      }
    }
    breakLine();
  }
  return lines;
}

type Rendered = { image: HTMLImageElement; width: number; height: number };
const cache = new Map<string, Rendered | Promise<Rendered | null> | null>();
const key = (tex: string, color: string, fontSizePx: number) => `${tex}|${color}|${Math.round(fontSizePx)}`;

/** The rendered formula when it is ready; otherwise starts rendering and returns null. */
export function peekInlineMath(tex: string, color: string, fontSizePx: number): Rendered | null {
  const hit = cache.get(key(tex, color, fontSizePx));
  if (hit && !(hit instanceof Promise)) return hit;
  if (hit === undefined) void loadInlineMath(tex, color, fontSizePx);
  return null;
}

export function loadInlineMath(tex: string, color: string, fontSizePx: number): Promise<Rendered | null> {
  const k = key(tex, color, fontSizePx);
  const hit = cache.get(k);
  if (hit instanceof Promise) return hit;
  if (hit !== undefined) return Promise.resolve(hit);
  // KaTeX sets formulas at 1.21em of the text; tiny sizes (thumbnails) render at 24px and draw scaled down
  const mathPx = fontSizePx * 1.21;
  const renderPx = Math.max(24, Math.round(mathPx));
  const scale = mathPx / renderPx;
  const pending = renderInlineKatexToPngDataUrl(tex, { color, fontSizePx: renderPx })
    .then(
      (r) =>
        new Promise<Rendered | null>((resolve) => {
          if (!r.dataUrl) return resolve(null);
          const image = new window.Image();
          image.onload = () => resolve({ image, width: r.width * scale, height: r.height * scale });
          image.onerror = () => resolve(null);
          image.src = r.dataUrl;
        }),
    )
    .catch(() => null)
    .then((r) => {
      cache.set(k, r);
      return r;
    });
  cache.set(k, pending);
  return pending;
}

/** Every formula in `text`, rendered; resolves once all are ready (for exports). */
export async function loadAllInlineMath(text: string, color: string, fontSizePx: number) {
  const texs = splitInlineMath(text).flatMap((s) => (s.kind === "math" ? [s.tex] : []));
  await Promise.all(texs.map((tex) => loadInlineMath(tex, color, fontSizePx)));
}

export interface InlineMathStyle {
  fontSizePx: number;
  fontFamily: string;
  fontStyle?: string;
  color: string;
  align?: string;
  lineHeight: number;
}

/** Sets `ctx`'s font to `style` and lays `text` out as it is drawn. */
function layoutIn(ctx: CanvasRenderingContext2D, text: string, width: number, style: InlineMathStyle) {
  const fontStyle = style.fontStyle && style.fontStyle !== "normal" ? `${style.fontStyle} ` : "";
  ctx.font = `${fontStyle}${style.fontSizePx}px ${style.fontFamily}`;
  return layoutInlineMath(
    text,
    width,
    (s) => ctx.measureText(s).width,
    (tex) => peekInlineMath(tex, style.color, style.fontSizePx),
    style.fontSizePx * style.lineHeight,
  );
}

const lineOffset = (line: LaidLine, width: number, align?: string) =>
  align === "center" ? (width - line.width) / 2 : align === "right" ? width - line.width : 0;

/** Draws `text` with its formulas into `ctx`, from (0,0), wrapped to `width`; returns the height used. */
export function drawInlineMath(ctx: CanvasRenderingContext2D, text: string, width: number, style: InlineMathStyle) {
  const lines = layoutIn(ctx, text, width, style);
  ctx.fillStyle = style.color;
  ctx.textBaseline = "middle";
  let y = 0;
  for (const line of lines) {
    const dx = lineOffset(line, width, style.align);
    const mid = y + line.height / 2;
    for (const item of line.items) {
      if (item.kind === "text") {
        ctx.fillText(item.text, dx + item.x, mid);
        continue;
      }
      const rendered = peekInlineMath(item.tex, style.color, style.fontSizePx);
      if (rendered) ctx.drawImage(rendered.image, dx + item.x, mid - item.height / 2, item.width, item.height);
    }
    y += line.height;
  }
  return y;
}

/**
 * PNG of a text box with inline maths at `scale`× its slide size, for the PPTX/PDF exports.
 * `heightPx` grows when the text needs more room, as the editor's fitted text boxes do.
 */
export async function renderInlineMathBoxPng(
  text: string,
  widthPx: number,
  heightPx: number,
  style: InlineMathStyle,
  scale = 3,
): Promise<{ dataUrl: string; heightPx: number } | null> {
  await loadAllInlineMath(text, style.color, style.fontSizePx);
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return null;
  const height = Math.max(heightPx, drawInlineMath(probe, text, widthPx, style));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(widthPx * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  drawInlineMath(ctx, text, widthPx, style);
  return { dataUrl: canvas.toDataURL("image/png"), heightPx: height };
}

/**
 * Which formula of `text`, laid out as `drawInlineMath` draws it, is under `point` (in the box's own
 * coordinates); -1 on plain text.
 */
export function inlineMathIndexAt(text: string, width: number, style: InlineMathStyle, point: { x: number; y: number }) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return -1;
  let y = 0;
  for (const line of layoutIn(ctx, text, width, style)) {
    if (point.y >= y && point.y < y + line.height) {
      const dx = lineOffset(line, width, style.align);
      const hit = line.items.find((i) => i.kind === "math" && point.x >= dx + i.x && point.x <= dx + i.x + i.width);
      return hit?.kind === "math" ? hit.index : -1;
    }
    y += line.height;
  }
  return -1;
}
