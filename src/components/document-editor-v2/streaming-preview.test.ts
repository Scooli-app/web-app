import { describe, expect, it } from "vitest";
import { partialPresentationToCanvas, presentationFollowTarget, slideHasPendingImage } from "./streaming-preview";

const slide = (id: string, title: string) => ({
  id,
  type: "slide",
  layout: "title-content",
  title,
  subtitle: null,
  content: [{ id: `${id}-b1`, type: "paragraph", text: `${title} — texto` }],
  image: null,
  notes: null,
});

describe("partialPresentationToCanvas", () => {
  it("converts the whole slides streamed so far, even fewer than a stored deck needs", () => {
    const canvas = partialPresentationToCanvas({
      schemaVersion: 1,
      documentType: "presentation",
      blocks: [slide("s1", "Causas"), slide("s2", "O dia 25")],
    });
    expect(canvas?.schemaVersion).toBe(2);
    expect(canvas?.slides.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("leaves out a slide that does not parse instead of failing the preview", () => {
    const canvas = partialPresentationToCanvas({
      blocks: [slide("s1", "Causas"), { id: "s2", type: "slide" }],
    });
    expect(canvas?.slides.map((s) => s.id)).toEqual(["s1"]);
  });

  it("applies the theme the model picked", () => {
    const plain = partialPresentationToCanvas({ blocks: [slide("s1", "Causas")] });
    const themed = partialPresentationToCanvas({ themeId: "dark", blocks: [slide("s1", "Causas")] });
    expect(themed?.themeId).toBe("dark");
    expect(themed?.slides[0].background).not.toEqual(plain?.slides[0].background);
  });

  it("is null before the first slide", () => {
    expect(partialPresentationToCanvas(null)).toBeNull();
    expect(partialPresentationToCanvas({ blocks: [] })).toBeNull();
  });
});

describe("following the presentation", () => {
  const withImage = (image: Record<string, unknown>) => ({ ...slide("s1", "Causas"), layout: "image-right", image });

  const firstSlide = (block: Record<string, unknown>) => {
    const canvas = partialPresentationToCanvas({ blocks: [block] });
    if (!canvas) throw new Error("the slide did not convert");
    return canvas.slides[0];
  };

  it("knows which slides still wait for their picture", () => {
    const pending = firstSlide(withImage({ id: "i1", type: "visual_placeholder", prompt: "Mapa da Europa em 1914 com as alianças" }));
    const done = firstSlide(withImage({ id: "i1", type: "image", url: "https://img/i1.png", alt: "Mapa" }));
    expect(slideHasPendingImage(pending)).toBe(true);
    expect(slideHasPendingImage(done)).toBe(false);
    expect(slideHasPendingImage(firstSlide(slide("s2", "Sem imagem")))).toBe(false);
  });

  it("follows the newest slide, then the next picture, then stays put", () => {
    expect(presentationFollowTarget("preparing", null)).toBe("end");
    expect(presentationFollowTarget("generating", null)).toBe("end");
    expect(presentationFollowTarget("reviewing", null)).toBeNull();
    expect(presentationFollowTarget("reviewing", { completed: 0, total: 4 })).toBe("pending");
    expect(presentationFollowTarget("images", { completed: 4, total: 4 })).toBeNull();
  });
});
