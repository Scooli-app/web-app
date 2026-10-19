/**
 * canvas-layout.ts
 *
 * Converts between the layout-based v1 PresentationDocument (SlideBlock[]) and
 * the position-based v2 CanvasPresentation (CanvasSlide[]).
 */

import {
  SCHEMA_VERSION,
  type ContentBlock,
  type PresentationDocument,
  type SlideBlock,
} from "@/shared/types/blocks";
import type {
  CanvasElement,
  CanvasGradient,
  CanvasImageElement,
  CanvasListElement,
  CanvasMathElement,
  CanvasPresentation,
  CanvasShapeElement,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { getThemeById, THEMES } from "@/shared/types/presentation-theme";

const BG_DEFAULT = "#16171e";

const PX = 0.04;
const PY = 0.071;

const FS_TITLE = 0.036;
const FS_BASE = 0.021;

const TITLE_H = 0.17;
const BODY_Y = PY + TITLE_H + 0.03;

function makeText(
  id: string,
  overrides: Partial<CanvasTextElement> & Pick<CanvasTextElement, "text">,
): CanvasTextElement {
  return {
    type: "text",
    id,
    x: PX,
    y: PY,
    w: 1 - PX * 2,
    h: TITLE_H,
    fontSize: FS_BASE,
    fontStyle: "normal",
    color: "#e5e7eb",
    align: "left",
    ...overrides,
  };
}

// Font sizes are fractions of the slide width, heights fractions of its (16:9) height.
const ASPECT = 16 / 9;
// Slightly above the editor's 1.3 line height so estimates err on the side of fitting.
const LINE_HEIGHT = 1.35;
// Average glyph width as a fraction of the font size, for wrapping estimates.
const CHAR_W = 0.5;
// Dense slides shrink their body text down to this (~29px on a 1920px-wide projection).
const FS_MIN = 0.015;
const FIT_STEP = 0.0005;

function headingFontSize(level: number | undefined, scale: number): number {
  return (level === 2 ? 0.03 : level === 3 ? 0.026 : 0.022) * scale;
}

function wrappedLines(text: string, width: number, fontSize: number): number {
  const charsPerLine = Math.max(8, Math.floor(width / (fontSize * CHAR_W)));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

function estimateBlockH(block: ContentBlock, width: number, fontSize: number): number {
  const lineH = fontSize * ASPECT * LINE_HEIGHT;
  const gap = lineH * 0.4;

  if (block.type === "paragraph") {
    return lineH * wrappedLines(block.text, width, fontSize) + gap;
  }
  if (block.type === "heading") {
    const fs = headingFontSize(block.level, fontSize / FS_BASE);
    return fs * ASPECT * LINE_HEIGHT * wrappedLines(block.text, width, fs) + gap;
  }
  if (block.type === "bullet_list" || block.type === "ordered_list") {
    // Leave room for the bullet / number marker.
    const textW = width - fontSize * 1.5;
    const lines = block.items.reduce((sum, item) => sum + wrappedLines(item, textW, fontSize), 0);
    return lines * lineH + block.items.length * gap * 0.5 + gap;
  }
  return lineH + gap;
}

/**
 * Largest body font size (from FS_BASE down to FS_MIN) at which the blocks fit in
 * `availableH`. Falls back to FS_MIN when even that overflows.
 */
function fitFontSize(blocks: ContentBlock[], width: number, availableH: number): number {
  for (let fs = FS_BASE; fs > FS_MIN; fs -= FIT_STEP) {
    const total = blocks.reduce((sum, b) => sum + estimateBlockH(b, width, fs), 0);
    if (total <= availableH) return fs;
  }
  return FS_MIN;
}

function layoutContentBlocks(
  blocks: ContentBlock[],
  startX: number,
  startY: number,
  width: number,
  fontSize: number = fitFontSize(blocks, width, 1 - PY - startY),
): CanvasElement[] {
  let y = startY;
  const result: CanvasElement[] = [];
  const availableH = 1 - PY - startY;
  const totalH = blocks.reduce((sum, b) => sum + estimateBlockH(b, width, fontSize), 0);
  // At the minimum font the estimate can still overflow; squeeze the boxes rather than
  // let them run off the slide (the editor re-fits real text heights on interaction).
  const squeeze = totalH > availableH ? availableH / totalH : 1;

  for (const block of blocks) {
    const h = estimateBlockH(block, width, fontSize) * squeeze;

    if (block.type === "paragraph") {
      result.push(
        makeText(block.id, {
          text: block.text,
          x: startX,
          y,
          w: width,
          h,
          fontSize,
        }),
      );
    } else if (block.type === "heading") {
      const fs = headingFontSize(block.level, fontSize / FS_BASE);
      result.push(
        makeText(block.id, {
          text: block.text,
          x: startX,
          y,
          w: width,
          h,
          fontSize: fs,
          fontStyle: "bold",
        }),
      );
    } else if (block.type === "bullet_list" || block.type === "ordered_list") {
      const el: CanvasListElement = {
        id: block.id,
        type: block.type,
        x: startX,
        y,
        w: width,
        h,
        items: block.items,
        fontSize,
        color: "#e5e7eb",
        blockId: block.id,
      };
      result.push(el);
    } else if (block.type === "math") {
      const el: CanvasMathElement = {
        id: block.id,
        type: "math",
        x: startX,
        y,
        w: width,
        h,
        tex: block.tex,
        fontSize,
        display: block.display ?? false,
        blockId: block.id,
      };
      result.push(el);
    }

    y += h;
  }

  return result;
}

export function slideToCanvas(slide: SlideBlock): CanvasSlide {
  const layout = slide.layout;
  const bg = BG_DEFAULT;
  const elements: CanvasElement[] = [];

  if (layout === "title") {
    elements.push(
      makeText(`${slide.id}-title`, {
        text: slide.title,
        x: 0.1,
        y: 0.28,
        w: 0.8,
        h: 0.22,
        fontSize: 0.048,
        fontStyle: "bold",
        align: "center",
        role: "title",
      }),
    );
    if (slide.subtitle !== null && slide.subtitle !== undefined) {
      elements.push(
        makeText(`${slide.id}-subtitle`, {
          text: slide.subtitle,
          x: 0.1,
          y: 0.58,
          w: 0.8,
          h: 0.14,
          fontSize: 0.026,
          color: "#6c6f80",
          align: "center",
          role: "subtitle",
        }),
      );
    }
  } else if (layout === "title-content" || layout === "conclusion") {
    const isConclusion = layout === "conclusion";
    const extraTop = isConclusion ? 0.08 : 0;

    if (isConclusion) {
      elements.push(
        makeText(`${slide.id}-label`, {
          text: "FINAL",
          x: PX,
          y: PY,
          w: 0.3,
          h: 0.06,
          fontSize: 0.016,
          color: "#6753FF",
          role: "label",
        }),
      );
    }

    elements.push(
      makeText(`${slide.id}-title`, {
        text: slide.title,
        x: PX,
        y: PY + extraTop,
        w: 1 - PX * 2,
        h: TITLE_H,
        fontSize: FS_TITLE,
        fontStyle: "bold",
        role: "title",
      }),
    );

    elements.push(
      ...layoutContentBlocks(
        slide.content ?? [],
        PX,
        PY + extraTop + TITLE_H + 0.03,
        1 - PX * 2,
      ),
    );
  } else if (layout === "image-left" || layout === "image-right") {
    const imgW = 0.42;
    const isLeft = layout === "image-left";
    const imgX = isLeft ? PX : PX + (1 - PX * 2 - imgW);
    const contentX = isLeft ? PX + imgW + PX : PX;
    const contentW = 1 - PX * 3 - imgW;
    const bodyH = 1 - BODY_Y - PY;

    elements.push(
      makeText(`${slide.id}-title`, {
        text: slide.title,
        x: PX,
        y: PY,
        w: 1 - PX * 2,
        h: TITLE_H,
        fontSize: FS_TITLE,
        fontStyle: "bold",
        role: "title",
      }),
    );

    if (slide.image?.type === "visual_placeholder") {
      elements.push({
        id: `${slide.id}-image`,
        type: "image_placeholder",
        x: imgX,
        y: BODY_Y,
        w: imgW,
        h: bodyH,
        prompt: slide.image.prompt,
      } as CanvasImageElement);
    } else if (slide.image?.type === "image") {
      elements.push({
        id: `${slide.id}-image`,
        type: "image_placeholder",
        x: imgX,
        y: BODY_Y,
        w: imgW,
        h: bodyH,
        prompt: slide.image.alt,
        url: slide.image.url,
        attribution: slide.image.attribution,
      } as CanvasImageElement);
    }

    elements.push(...layoutContentBlocks(slide.content ?? [], contentX, BODY_Y, contentW));
  } else if (layout === "two-column") {
    const colW = (1 - PX * 3) / 2;
    const content = slide.content ?? [];
    const mid = Math.ceil(content.length / 2);

    elements.push(
      makeText(`${slide.id}-title`, {
        text: slide.title,
        x: PX,
        y: PY,
        w: 1 - PX * 2,
        h: TITLE_H,
        fontSize: FS_TITLE,
        fontStyle: "bold",
        role: "title",
      }),
    );

    // Both columns use the same font size: the one that fits the fuller column.
    const left = content.slice(0, mid);
    const right = content.slice(mid);
    const bodyH = 1 - PY - BODY_Y;
    const fs = Math.min(fitFontSize(left, colW, bodyH), fitFontSize(right, colW, bodyH));
    elements.push(...layoutContentBlocks(left, PX, BODY_Y, colW, fs));
    elements.push(...layoutContentBlocks(right, PX * 2 + colW, BODY_Y, colW, fs));
  } else if (layout === "full-image") {
    if (slide.image?.type === "visual_placeholder") {
      elements.push({
        id: `${slide.id}-image`,
        type: "image_placeholder",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        prompt: slide.image.prompt,
      } as CanvasImageElement);
    } else if (slide.image?.type === "image") {
      elements.push({
        id: `${slide.id}-image`,
        type: "image_placeholder",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        prompt: slide.image.alt,
        url: slide.image.url,
        attribution: slide.image.attribution,
      } as CanvasImageElement);
    }

    elements.push(
      makeText(`${slide.id}-title`, {
        text: slide.title,
        x: PX,
        y: 0.67,
        w: 1 - PX * 2,
        h: 0.14,
        fontSize: 0.042,
        fontStyle: "bold",
        color: "#ffffff",
        role: "title",
      }),
    );

    if (slide.subtitle !== null && slide.subtitle !== undefined) {
      elements.push(
        makeText(`${slide.id}-subtitle`, {
          text: slide.subtitle,
          x: PX,
          y: 0.82,
          w: 1 - PX * 2,
          h: 0.1,
          fontSize: 0.024,
          color: "rgba(255,255,255,0.85)",
          role: "subtitle",
        }),
      );
    }
  }

  return { id: slide.id, layout, background: bg, elements, notes: slide.notes };
}

export function canvasToSlide(cs: CanvasSlide, slideIdx: number): SlideBlock {
  const titleEl = cs.elements.find(
    (e): e is CanvasTextElement => e.type === "text" && e.role === "title",
  );
  const subtitleEl = cs.elements.find(
    (e): e is CanvasTextElement => e.type === "text" && e.role === "subtitle",
  );
  const imageEl = cs.elements.find(
    (e): e is CanvasImageElement => e.type === "image_placeholder",
  );

  const contentElems = cs.elements
    .filter((e) => {
      if (e.type === "image_placeholder") return false;
      if (e.type === "shape") return false;
      if (e.type === "text" && e.role) return false;
      return true;
    })
    .sort((a, b) => a.y - b.y);

  const content: ContentBlock[] = contentElems.flatMap<ContentBlock>((e) => {
    if (e.type === "text") {
      return [{ id: e.id, type: "paragraph" as const, text: e.text }];
    }
    if (e.type === "bullet_list") {
      return [{ id: e.blockId, type: "bullet_list" as const, items: e.items }];
    }
    if (e.type === "ordered_list") {
      return [{ id: e.blockId, type: "ordered_list" as const, items: e.items }];
    }
    if (e.type === "math") {
      return [{ id: e.blockId, type: "math" as const, tex: e.tex, display: e.display }];
    }
    return [];
  });

  return {
    id: cs.id,
    type: "slide",
    layout: cs.layout as SlideBlock["layout"],
    title: titleEl?.text ?? `Slide ${slideIdx + 1}`,
    subtitle: subtitleEl?.text,
    content: content.length > 0 ? content : undefined,
    image: imageEl
      ? {
          id: `${cs.id}-img`,
          type: "visual_placeholder",
          prompt: imageEl.prompt,
        }
      : undefined,
    // SlideBlock.notes is capped at 2000 (blocks.ts); a longer note (e.g. from the AI chat)
    // would otherwise fail validation and block saving the deck.
    notes: cs.notes ? cs.notes.slice(0, 2000) : undefined,
  };
}

export function clampCanvasSlide(cs: CanvasSlide): CanvasSlide {
  return {
    ...cs,
    elements: cs.elements.map((el): CanvasElement => {
      // Decoration shapes may intentionally extend beyond the slide (bleed off edges).
      if (el.type === "shape" && (el as CanvasShapeElement).isDecoration) return el;

      const x = Math.min(Math.max(el.x, 0), 1);
      const y = Math.min(Math.max(el.y, 0), 1);
      const w = Math.min(Math.max(el.w, 0.01), 1);
      const h = Math.min(Math.max(el.h, 0.01), 1);

      if (el.type === "shape") {
        const shape = el as CanvasShapeElement;
        return {
          ...shape,
          x,
          y,
          w,
          h,
          strokeWidth: Math.min(Math.max(shape.strokeWidth ?? 0.004, 0.001), 0.05),
        };
      }

      return { ...el, x, y, w, h };
    }),
  };
}

export function presentationToCanvas(doc: PresentationDocument): CanvasPresentation {
  const canvas: CanvasPresentation = {
    schemaVersion: 2,
    documentType: "presentation",
    slides: doc.blocks.map(slideToCanvas),
  };
  // The theme the model picked at generation (lesson decks); unknown ids are ignored.
  return doc.themeId && THEMES.some((t) => t.id === doc.themeId) ? applyTheme(canvas, doc.themeId) : canvas;
}

export function canvasToPresentation(cp: CanvasPresentation): PresentationDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    documentType: "presentation",
    blocks: cp.slides.map((s, i) => canvasToSlide(s, i)),
  };
}

// Renderers' default line height when an element has none (SlideKonvaEditor / CanvasSlideView).
const RENDER_LINE_HEIGHT = 1.3;
// How far a theme may shrink body text back down when its larger type would overflow.
const REFLOW_MIN_SHRINK = 0.75;
const REFLOW_SHRINK_STEP = 0.03;

type TextLike = CanvasTextElement | CanvasListElement;

function isTextLike(el: CanvasElement): el is TextLike {
  return el.type === "text" || el.type === "bullet_list" || el.type === "ordered_list";
}

/** Estimated wrapped line count of a text/list element at a given font size. */
function estimatedLines(el: TextLike, fontSize: number): number {
  if (el.type === "text") {
    return el.text.split("\n").reduce((sum, line) => sum + wrappedLines(line, el.w, fontSize), 0);
  }
  return el.items.reduce((sum, item) => sum + wrappedLines(item, el.w - fontSize * 1.5, fontSize), 0);
}

function overlapsHorizontally(a: CanvasElement, b: CanvasElement): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w;
}

/**
 * When a theme changes typography (font scale / line height), resize text and list
 * boxes to the new estimated height and push the elements stacked below them in the
 * same column. If the slide would then run off the bottom, body text is stepped back
 * down (never below REFLOW_MIN_SHRINK of the themed size). Titles keep their size.
 * Elements whose typography did not change are returned untouched.
 */
function reflowTypography(before: CanvasElement[], after: CanvasElement[]): CanvasElement[] {
  const changed = after.some((el, i) => {
    const prev = before[i];
    return (
      isTextLike(el) &&
      prev !== undefined &&
      isTextLike(prev) &&
      (el.fontSize !== prev.fontSize ||
        (el.lineHeight ?? RENDER_LINE_HEIGHT) !== (prev.lineHeight ?? RENDER_LINE_HEIGHT))
    );
  });
  if (!changed) return after;

  const order = after.map((_, i) => i).sort((a, b) => (after[a]?.y ?? 0) - (after[b]?.y ?? 0));
  const originalBottom = Math.max(1 - PY, ...after.map((el) => el.y + el.h));

  function layout(shrink: number) {
    const fontSizes: number[] = [];
    const heights = after.map((el, i) => {
      const prev = before[i];
      if (!isTextLike(el) || !prev || !isTextLike(prev)) return el.h;
      const fs = el.type === "text" && el.role === "title" ? el.fontSize : el.fontSize * shrink;
      fontSizes[i] = fs;
      const oldLine = prev.fontSize * (prev.lineHeight ?? RENDER_LINE_HEIGHT);
      const newLine = fs * (el.lineHeight ?? RENDER_LINE_HEIGHT);
      const lines = estimatedLines(el, fs);
      const lineRatio = lines / estimatedLines(prev, prev.fontSize);
      // Never below the estimated height, so a box that was already tight still fits.
      return Math.max(el.h * (newLine / oldLine) * lineRatio, lines * newLine * ASPECT);
    });

    // Each element moves by the shift of the nearest element stacked above it in its column.
    const shifts: number[] = after.map(() => 0);
    order.forEach((i, pos) => {
      const el = after[i];
      if (!el) return;
      let nearest = -1;
      for (const j of order.slice(0, pos)) {
        const above = after[j];
        if (!above || !overlapsHorizontally(above, el) || above.y + above.h > el.y + 0.01) continue;
        if (nearest === -1 || above.y + above.h > (after[nearest]?.y ?? 0) + (after[nearest]?.h ?? 0)) {
          nearest = j;
        }
      }
      if (nearest !== -1) {
        shifts[i] = (shifts[nearest] ?? 0) + (heights[nearest] ?? 0) - (after[nearest]?.h ?? 0);
      }
    });

    const bottom = Math.max(...after.map((el, i) => el.y + (shifts[i] ?? 0) + (heights[i] ?? el.h)));
    return { fontSizes, heights, shifts, bottom };
  }

  let shrink = 1;
  let result = layout(shrink);
  while (result.bottom > originalBottom + 0.001 && shrink - REFLOW_SHRINK_STEP >= REFLOW_MIN_SHRINK) {
    shrink -= REFLOW_SHRINK_STEP;
    result = layout(shrink);
  }

  return after.map((el, i) => {
    const moved = { ...el, y: el.y + (result.shifts[i] ?? 0), h: result.heights[i] ?? el.h };
    const fs = result.fontSizes[i];
    if (!isTextLike(el) || fs === undefined || fs === el.fontSize) return moved;
    const scale = (el.themeFontScale ?? 1) * (fs / el.fontSize);
    return { ...moved, fontSize: fs, themeFontScale: Math.abs(scale - 1) < 1e-6 ? undefined : scale };
  });
}

export function applyTheme(cp: CanvasPresentation, themeId: string): CanvasPresentation {
  const theme = getThemeById(themeId);

  const backgroundGradient: CanvasGradient | undefined = theme.bgGradient
    ? { type: "linear", angle: theme.bgGradient.angle, stops: theme.bgGradient.stops }
    : undefined;

  const fontScale = theme.fontScale ?? 1;

  /** Font size, line height and scale marker for a text/list element under this theme. */
  function typography(el: { fontSize: number; themeFontScale?: number }) {
    const baseSize = el.fontSize / (el.themeFontScale ?? 1);
    return {
      fontSize: baseSize * fontScale,
      themeFontScale: fontScale === 1 ? undefined : fontScale,
      lineHeight: theme.lineHeight,
    };
  }

  function buildDecorations(decoList: typeof theme.decorations): CanvasShapeElement[] {
    return (decoList ?? []).map((d, i) => ({
      type: "shape" as const,
      id: `__deco_${i}`,
      x: d.x,
      y: d.y,
      w: d.w,
      h: d.h,
      rotation: d.rotation,
      shape: d.shape,
      fill: d.fill,
      stroke: d.stroke,
      strokeWidth: d.strokeWidth,
      cornerRadius: d.cornerRadius,
      isDecoration: true,
    }));
  }

  return {
    ...cp,
    themeId,
    slides: cp.slides.map((slide) => {
      const isCover = slide.layout === "title";
      const decoSource = isCover
        ? (theme.coverDecorations ?? theme.decorations)
        : theme.decorations;
      const decorationShapes = buildDecorations(decoSource);

      const originalElements = slide.elements.filter(
        (el) => !(el.type === "shape" && (el as CanvasShapeElement).isDecoration),
      );
      const themedElements = originalElements.map((el): CanvasElement => {
        if (el.type === "text") {
          const color =
            el.role === "title"
              ? theme.titleColor
              : el.role === "subtitle"
                ? theme.mutedColor
                : el.role === "label"
                  ? theme.accentColor
                  : theme.bodyColor;
          const fontFamily =
            el.role === "title" || el.role === "label"
              ? theme.titleFont
              : el.role === "subtitle"
                ? theme.titleFont
                : theme.bodyFont;
          // Reposition cover-slide title/subtitle when the theme has a side panel
          if (isCover && theme.coverTextLayout) {
            const slot =
              el.role === "title"
                ? theme.coverTextLayout.title
                : el.role === "subtitle"
                  ? theme.coverTextLayout.subtitle
                  : undefined;
            if (slot) {
              return {
                ...el,
                ...typography(el),
                color,
                fontFamily,
                x: slot.x,
                y: slot.y,
                w: slot.w,
                ...(slot.h !== undefined ? { h: slot.h } : {}),
                ...(slot.align !== undefined ? { align: slot.align } : {}),
              };
            }
          }
          return { ...el, ...typography(el), color, fontFamily };
        }
        if (el.type === "bullet_list" || el.type === "ordered_list") {
          return { ...el, ...typography(el), color: theme.bodyColor, fontFamily: theme.bodyFont };
        }
        return el;
      });
      const contentElements = reflowTypography(originalElements, themedElements);

      return {
        ...slide,
        background: theme.bg,
        backgroundGradient,
        elements: [...decorationShapes, ...contentElements],
      };
    }),
  };
}
