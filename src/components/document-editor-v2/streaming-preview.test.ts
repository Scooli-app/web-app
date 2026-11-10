import { describe, expect, it } from "vitest";
import { partialPresentationToCanvas } from "./streaming-preview";

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
