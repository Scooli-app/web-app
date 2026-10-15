import { describe, expect, it } from "vitest";
import { imageBlockSchema, type SlideBlock } from "@/shared/types/blocks";
import {
  isCanvasPresentation,
  type CanvasImageElement,
  type CanvasPresentation,
} from "@/shared/types/canvas-presentation";
import { formatImageCredit } from "@/shared/utils/photo-credit";
import { slideToCanvas } from "./canvas-layout";

// Stock images must keep their author/licence credit: from the generated deck into the
// editor, and through the canvas JSON that is saved as document.content and reloaded.

const attribution = {
  provider: "pexels",
  author: "Ana Silva",
  authorUrl: "https://www.pexels.com/@ana",
  sourceUrl: "https://www.pexels.com/photo/123/",
};

const slide: SlideBlock = {
  id: "s3",
  type: "slide",
  layout: "image-right",
  title: "Serra da Estrela",
  subtitle: undefined,
  notes: undefined,
  content: [{ id: "s3-b1", type: "paragraph", text: "O ponto mais alto de Portugal continental." }],
  image: {
    id: "s3-img",
    type: "image",
    url: "https://api.example.com/public/images/doc/img.jpg",
    alt: "Serra da Estrela com neve (Foto: Ana Silva / Pexels)",
    attribution,
  },
};

function imageOf(elements: CanvasPresentation["slides"][number]["elements"]): CanvasImageElement {
  const image = elements.find((el): el is CanvasImageElement => el.type === "image_placeholder");
  if (!image) throw new Error("no image element");
  return image;
}

describe("stock photo attribution", () => {
  it("is accepted by the image block schema", () => {
    expect(imageBlockSchema.parse(slide.image).attribution).toEqual(attribution);
  });

  it("carries over from a generated image block to the canvas element", () => {
    expect(imageOf(slideToCanvas(slide).elements).attribution).toEqual(attribution);
  });

  it("survives saving and reloading the canvas JSON", () => {
    const canvas: CanvasPresentation = {
      schemaVersion: 2,
      documentType: "presentation",
      slides: [slideToCanvas(slide)],
    };
    const reloaded: unknown = JSON.parse(JSON.stringify(canvas));
    expect(isCanvasPresentation(reloaded)).toBe(true);
    expect(imageOf((reloaded as CanvasPresentation).slides[0].elements).attribution).toEqual(attribution);
  });

  it("formats a short credit line", () => {
    expect(formatImageCredit(attribution)).toBe("Ana Silva / Pexels");
    expect(formatImageCredit({ provider: "pexels", author: null })).toBe("Pexels");
    expect(formatImageCredit({ provider: "pexels", author: "Ana", license: "Pexels License" })).toBe("Ana / Pexels");
    expect(formatImageCredit(undefined)).toBeNull();
  });

  it("names the licence for CC BY / CC BY-SA images", () => {
    expect(
      formatImageCredit({ provider: "wikimedia", author: "LadyofHats", license: "CC BY-SA 4.0" }),
    ).toBe("LadyofHats / Wikimedia Commons, CC BY-SA 4.0");
    expect(formatImageCredit({ provider: "openverse", author: null, license: "CC BY 2.0" })).toBe(
      "Openverse, CC BY 2.0",
    );
    expect(formatImageCredit({ provider: "wikimedia", author: "X", license: "Public domain" })).toBe(
      "X / Wikimedia Commons",
    );
  });
});
