/**
 * canvas-layout.ts
 *
 * Converts between the layout-based v1 PresentationDocument (SlideBlock[]) and
 * the position-based v2 CanvasPresentation (CanvasSlide[]).
 *
 * Exported functions:
 *   slideToCanvas(slide)        → CanvasSlide          (v1 → v2, single slide)
 *   canvasToSlide(cs, idx)      → SlideBlock           (v2 → v1, single slide)
 *   presentationToCanvas(doc)   → CanvasPresentation   (v1 → v2, full doc)
 *   canvasToPresentation(cp)    → PresentationDocument (v2 → v1, full doc)
 */

import {
  SCHEMA_VERSION,
  type ContentBlock,
  type PresentationDocument,
  type SlideBlock,
} from "@/shared/types/blocks";
import type {
  CanvasElement,
  CanvasImageElement,
  CanvasListElement,
  CanvasMathElement,
  CanvasPresentation,
  CanvasSlide,
  CanvasTextElement,
} from "@/shared/types/canvas-presentation";
import { getThemeById } from "@/shared/types/presentation-theme";

/* --------------------------------------------------------------------------
 * Layout constants (all fractions)
 * -------------------------------------------------------------------------- */

const BG_DEFAULT = "#16171e";
const BG_CONCLUSION = "#1e1f2e";

const PX = 0.04;  // horizontal padding (fraction of W)
const PY = 0.071; // vertical padding (fraction of H)  ≈ PX * 16/9

const FS_TITLE = 0.036; // title font size (fraction of W)
const FS_BASE = 0.021;  // body font size  (fraction of W)

const TITLE_H = 0.17;   // title row height (fraction of H)
const BODY_Y = PY + TITLE_H + 0.03; // body start Y after title

/* --------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

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

/**
 * Estimate height of a content block in fractions of H.
 * lineH ≈ FS_BASE * 1.5 * (W/H) = FS_BASE * 16/9 ≈ 0.037
 * gap   ≈ lineH * 0.4                              ≈ 0.015
 */
function estimateBlockH(block: ContentBlock): number {
  const lineH = FS_BASE * (16 / 9) * 1.5; // ≈ 0.056
  const gap = lineH * 0.4;                 // ≈ 0.022

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
      result.push(makeText(block.id, {
        text: block.text, x: startX, y, w: width, h, fontSize: FS_BASE,
      }));
    } else if (block.type === "heading") {
      const fs =
        block.level === 2 ? 0.030 :
        block.level === 3 ? 0.026 : 0.022;
      result.push(makeText(block.id, {
        text: block.text, x: startX, y, w: width, h, fontSize: fs, fontStyle: "bold",
      }));
    } else if (block.type === "bullet_list" || block.type === "ordered_list") {
      const el: CanvasListElement = {
        id: block.id,
        type: block.type,
        x: startX, y, w: width, h,
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
        x: startX, y, w: width, h,
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

/* --------------------------------------------------------------------------
 * slideToCanvas — v1 SlideBlock → v2 CanvasSlide
 * -------------------------------------------------------------------------- */

export function slideToCanvas(slide: SlideBlock): CanvasSlide {
  const layout = slide.layout;
  const bg = layout === "conclusion" ? BG_CONCLUSION : BG_DEFAULT;
  const elements: CanvasElement[] = [];

  /* ── title layout ─────────────────────────────────────────────────────── */
  if (layout === "title") {
    elements.push(makeText(`${slide.id}-title`, {
      text: slide.title,
      x: 0.10, y: 0.28, w: 0.80, h: 0.22,
      fontSize: 0.048, fontStyle: "bold", align: "center",
      role: "title",
    }));
    if (slide.subtitle !== null && slide.subtitle !== undefined) {
      elements.push(makeText(`${slide.id}-subtitle`, {
        text: slide.subtitle,
        x: 0.10, y: 0.58, w: 0.80, h: 0.14,
        fontSize: 0.026, color: "#6c6f80", align: "center",
        role: "subtitle",
      }));
    }
  }

  /* ── title-content & conclusion ────────────────────────────────────────── */
  else if (layout === "title-content" || layout === "conclusion") {
    const isConclusion = layout === "conclusion";
    const extraTop = isConclusion ? 0.08 : 0;

    if (isConclusion) {
      elements.push(makeText(`${slide.id}-label`, {
        text: "CONCLUSÃO",
        x: PX, y: PY, w: 0.30, h: 0.06,
        fontSize: 0.016, color: "#6753FF",
        role: "label",
      }));
    }

    elements.push(makeText(`${slide.id}-title`, {
      text: slide.title,
      x: PX, y: PY + extraTop, w: 1 - PX * 2, h: TITLE_H,
      fontSize: FS_TITLE, fontStyle: "bold",
      role: "title",
    }));

    elements.push(
      ...layoutContentBlocks(
        slide.content ?? [],
        PX,
        PY + extraTop + TITLE_H + 0.03,
        1 - PX * 2,
      ),
    );
  }

  /* ── image-left / image-right ─────────────────────────────────────────── */
  else if (layout === "image-left" || layout === "image-right") {
    const imgW = 0.42;
    const isLeft = layout === "image-left";
    const imgX = isLeft ? PX : PX + (1 - PX * 2 - imgW);
    const contentX = isLeft ? PX + imgW + PX : PX;
    const contentW = 1 - PX * 3 - imgW;
    const bodyH = 1 - BODY_Y - PY;

    elements.push(makeText(`${slide.id}-title`, {
      text: slide.title,
      x: PX, y: PY, w: 1 - PX * 2, h: TITLE_H,
      fontSize: FS_TITLE, fontStyle: "bold",
      role: "title",
    }));

    if (slide.image?.type === "visual_placeholder") {
      const img: CanvasImageElement = {
        id: `${slide.id}-image`,
        type: "image_placeholder",
        x: imgX, y: BODY_Y, w: imgW, h: bodyH,
        prompt: slide.image.prompt,
      };
      elements.push(img);
    }

    elements.push(
      ...layoutContentBlocks(slide.content ?? [], contentX, BODY_Y, contentW),
    );
  }

  /* ── two-column ────────────────────────────────────────────────────────── */
  else if (layout === "two-column") {
    const colW = (1 - PX * 3) / 2;
    const content = slide.content ?? [];
    const mid = Math.ceil(content.length / 2);

    elements.push(makeText(`${slide.id}-title`, {
      text: slide.title,
      x: PX, y: PY, w: 1 - PX * 2, h: TITLE_H,
      fontSize: FS_TITLE, fontStyle: "bold",
      role: "title",
    }));

    elements.push(
      ...layoutContentBlocks(content.slice(0, mid), PX, BODY_Y, colW),
    );
    elements.push(
      ...layoutContentBlocks(content.slice(mid), PX * 2 + colW, BODY_Y, colW),
    );
  }

  /* ── full-image ────────────────────────────────────────────────────────── */
  else if (layout === "full-image") {
    if (slide.image?.type === "visual_placeholder") {
      const img: CanvasImageElement = {
        id: `${slide.id}-image`,
        type: "image_placeholder",
        x: 0, y: 0, w: 1, h: 1,
        prompt: slide.image.prompt,
      };
      elements.push(img);
    }

    elements.push(makeText(`${slide.id}-title`, {
      text: slide.title,
      x: PX, y: 0.67, w: 1 - PX * 2, h: 0.14,
      fontSize: 0.042, fontStyle: "bold", color: "#ffffff",
      role: "title",
    }));

    if (slide.subtitle !== null && slide.subtitle !== undefined) {
      elements.push(makeText(`${slide.id}-subtitle`, {
        text: slide.subtitle,
        x: PX, y: 0.82, w: 1 - PX * 2, h: 0.10,
        fontSize: 0.024, color: "rgba(255,255,255,0.85)",
        role: "subtitle",
      }));
    }
  }

  return { id: slide.id, layout, background: bg, elements };
}

/* --------------------------------------------------------------------------
 * canvasToSlide — v2 CanvasSlide → v1 SlideBlock  (for presentation view)
 * -------------------------------------------------------------------------- */

export function canvasToSlide(cs: CanvasSlide, slideIdx: number): SlideBlock {
  const titleEl = cs.elements.find(
    (e): e is CanvasTextElement =>
      e.type === "text" && (e as CanvasTextElement).role === "title",
  );
  const subtitleEl = cs.elements.find(
    (e): e is CanvasTextElement =>
      e.type === "text" && (e as CanvasTextElement).role === "subtitle",
  );
  const imageEl = cs.elements.find(
    (e): e is CanvasImageElement => e.type === "image_placeholder",
  );

  // Content: all elements without a semantic role, sorted by Y position
  const contentElems = cs.elements
    .filter((e) => {
      if (e.type === "image_placeholder") return false;
      if (e.type === "text" && (e as CanvasTextElement).role) return false;
      return true;
    })
    .sort((a, b) => a.y - b.y);

  const content: ContentBlock[] = contentElems.map((e) => {
    if (e.type === "text") {
      const t = e as CanvasTextElement;
      return { id: t.id, type: "paragraph" as const, text: t.text };
    }
    if (e.type === "bullet_list") {
      const l = e as CanvasListElement;
      return { id: l.blockId, type: "bullet_list" as const, items: l.items };
    }
    if (e.type === "ordered_list") {
      const l = e as CanvasListElement;
      return { id: l.blockId, type: "ordered_list" as const, items: l.items };
    }
    if (e.type === "math") {
      const m = e as CanvasMathElement;
      return { id: m.blockId, type: "math" as const, tex: m.tex, display: m.display };
    }
    // fallback — should not happen
    return null as never;
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

/* --------------------------------------------------------------------------
 * Full document conversions
 * -------------------------------------------------------------------------- */

export function presentationToCanvas(
  doc: PresentationDocument,
): CanvasPresentation {
  return {
    schemaVersion: 2,
    documentType: "presentation",
    slides: doc.blocks.map(slideToCanvas),
  };
}

export function canvasToPresentation(
  cp: CanvasPresentation,
): PresentationDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    documentType: "presentation",
    blocks: cp.slides.map((s, i) => canvasToSlide(s, i)),
  };
}

/* --------------------------------------------------------------------------
 * applyTheme — recolour all slides with the selected theme palette
 * -------------------------------------------------------------------------- */

export function applyTheme(
  cp: CanvasPresentation,
  themeId: string,
): CanvasPresentation {
  const theme = getThemeById(themeId);

  return {
    ...cp,
    themeId,
    slides: cp.slides.map((slide) => ({
      ...slide,
      background: theme.bg,
      elements: slide.elements.map((el): CanvasElement => {
        if (el.type === "text") {
          const t = el as CanvasTextElement;
          const color =
            t.role === "title"    ? theme.titleColor  :
            t.role === "subtitle" ? theme.mutedColor  :
            t.role === "label"    ? theme.accentColor :
                                    theme.bodyColor;
          return { ...t, color };
        }
        if (el.type === "bullet_list" || el.type === "ordered_list") {
          return { ...el, color: theme.bodyColor } as CanvasElement;
        }
        return el;
      }),
    })),
  };
}
