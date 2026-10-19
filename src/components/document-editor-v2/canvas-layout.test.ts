import { describe, expect, it } from "vitest";
import type { SlideBlock } from "@/shared/types/blocks";
import type { CanvasElement } from "@/shared/types/canvas-presentation";
import { slideToCanvas } from "./canvas-layout";

// Generated slides now carry an explanation paragraph plus 3-5 full-sentence bullets
// (50-80 words). The layout used to assume one line per bullet and never shrank the
// font, so dense slides overflowed the bottom edge.

const PY = 0.071;
const FS_BASE = 0.021;
const MIN_FONT = 0.015;

const sentence =
  "O denominador indica em quantas partes iguais o todo foi dividido, por exemplo quatro fatias.";

function slide(layout: SlideBlock["layout"], items: number, paragraph = sentence): SlideBlock {
  return {
    id: "s3",
    type: "slide",
    layout,
    title: "O que é uma fração?",
    content: [
      { id: "s3-b1", type: "paragraph", text: paragraph },
      { id: "s3-b2", type: "bullet_list", items: Array.from({ length: items }, () => sentence) },
    ],
    image:
      layout === "image-left" || layout === "image-right"
        ? { id: "s3-img", type: "visual_placeholder", prompt: "pizza dividida em 4" }
        : undefined,
  } as SlideBlock;
}

function body(elements: CanvasElement[]) {
  return elements.filter((e) => e.type === "text" ? e.role === undefined : e.type !== "image_placeholder");
}

function fontOf(e: CanvasElement): number {
  return (e as { fontSize: number }).fontSize;
}

describe("slideToCanvas text fitting", () => {
  it("keeps the base font when the content fits", () => {
    const canvas = slideToCanvas(slide("title-content", 2, "Uma fração é uma parte de um todo."));
    for (const el of body(canvas.elements)) expect(fontOf(el)).toBe(FS_BASE);
  });

  it.each(["image-left", "image-right", "title-content", "two-column"] as const)(
    "never lets dense content run past the bottom edge (%s)",
    (layout) => {
      const canvas = slideToCanvas(slide(layout, 5, `${sentence} ${sentence}`));
      for (const el of body(canvas.elements)) {
        expect(el.y + el.h).toBeLessThanOrEqual(1 - PY + 1e-9);
      }
    },
  );

  it("shrinks the font of a dense image slide, but not below a readable minimum", () => {
    const canvas = slideToCanvas(slide("image-left", 5, `${sentence} ${sentence}`));
    const fonts = body(canvas.elements).map(fontOf);
    expect(Math.max(...fonts)).toBeLessThan(FS_BASE);
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(MIN_FONT);
  });

  it("estimates wrapped bullets from the column width, not one line per item", () => {
    const wide = slideToCanvas(slide("title-content", 3));
    const narrow = slideToCanvas(slide("image-left", 3));
    const listH = (els: CanvasElement[]) => els.find((e) => e.type === "bullet_list")?.h ?? 0;
    expect(listH(narrow.elements)).toBeGreaterThan(listH(wide.elements));
  });
});
