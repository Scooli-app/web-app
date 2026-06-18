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
import { getThemeById } from "@/shared/types/presentation-theme";

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

function estimateBlockH(block: ContentBlock): number {
  const lineH = FS_BASE * (16 / 9) * 1.5;
  const gap = lineH * 0.4;

  if (block.type === "paragraph") {
    const lines = Math.max(1, Math.ceil(block.text.length / 60));
    return lineH * lines + gap;
  }
  if (block.type === "heading") {
    const factor = block.level === 2 ? 1.4 : block.level === 3 ? 1.2 : 1.1;
    return lineH * factor + gap;
  }
  if (block.type === "bullet_list" || block.type === "ordered_list") {
    return block.items.length * (lineH + gap * 0.5) + gap;
  }
  if (block.type === "math") {
    return lineH + gap;
  }
  return lineH + gap;
}

function layoutContentBlocks(
  blocks: ContentBlock[],
  startX: number,
  startY: number,
  width: number,
): CanvasElement[] {
  let y = startY;
  const result: CanvasElement[] = [];

  for (const block of blocks) {
    const h = estimateBlockH(block);

    if (block.type === "paragraph") {
      result.push(
        makeText(block.id, {
          text: block.text,
          x: startX,
          y,
          w: width,
          h,
          fontSize: FS_BASE,
        }),
      );
    } else if (block.type === "heading") {
      const fs = block.level === 2 ? 0.03 : block.level === 3 ? 0.026 : 0.022;
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
        fontSize: FS_BASE,
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
        fontSize: FS_BASE,
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

    elements.push(...layoutContentBlocks(content.slice(0, mid), PX, BODY_Y, colW));
    elements.push(...layoutContentBlocks(content.slice(mid), PX * 2 + colW, BODY_Y, colW));
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

  return { id: slide.id, layout, background: bg, elements };
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
    notes: undefined,
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
  return {
    schemaVersion: 2,
    documentType: "presentation",
    slides: doc.blocks.map(slideToCanvas),
  };
}

export function canvasToPresentation(cp: CanvasPresentation): PresentationDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    documentType: "presentation",
    blocks: cp.slides.map((s, i) => canvasToSlide(s, i)),
  };
}

export function applyTheme(cp: CanvasPresentation, themeId: string): CanvasPresentation {
  const theme = getThemeById(themeId);

  const backgroundGradient: CanvasGradient | undefined = theme.bgGradient
    ? { type: "linear", angle: theme.bgGradient.angle, stops: theme.bgGradient.stops }
    : undefined;

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

      const contentElements = slide.elements
        .filter((el) => !(el.type === "shape" && (el as CanvasShapeElement).isDecoration))
        .map((el): CanvasElement => {
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
            return { ...el, color, fontFamily };
          }
          if (el.type === "bullet_list" || el.type === "ordered_list") {
            return { ...el, color: theme.bodyColor };
          }
          return el;
        });

      return {
        ...slide,
        background: theme.bg,
        backgroundGradient,
        elements: [...decorationShapes, ...contentElements],
      };
    }),
  };
}
