import { describe, expect, it } from "vitest";
import type { SlideBlock } from "@/shared/types/blocks";
import { canvasToSlide, slideToCanvas } from "./canvas-layout";

// The generator writes per-slide speaker notes; canvasToSlide used to set notes to
// undefined, so they were dropped on the way into the editor and back out.

const slide: SlideBlock = {
  id: "s2",
  type: "slide",
  layout: "title-content",
  title: "Evaporação",
  subtitle: undefined,
  image: undefined,
  content: [{ id: "s2-b1", type: "paragraph", text: "O Sol aquece a água." }],
  notes: "Pergunta à turma onde já viram vapor de água.",
};

describe("speaker notes", () => {
  it("survive the SlideBlock -> canvas -> SlideBlock round trip", () => {
    const cs = slideToCanvas(slide);
    expect(cs.notes).toBe(slide.notes);
    expect(canvasToSlide(cs, 1).notes).toBe(slide.notes);
  });

  it("are never drawn as a slide element", () => {
    const cs = slideToCanvas(slide);
    const texts = cs.elements.flatMap((el) => (el.type === "text" ? [el.text] : []));
    expect(texts).not.toContain(slide.notes);
  });

  it("empty notes map to undefined", () => {
    const cs = { ...slideToCanvas(slide), notes: "" };
    expect(canvasToSlide(cs, 1).notes).toBeUndefined();
  });
});
