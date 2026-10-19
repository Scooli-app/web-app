import { describe, expect, it } from "vitest";
import { getPresentationToolbarTitleDisplay } from "@/components/document-editor-v2/presentation-toolbar-title";

const LONG_TITLE =
  "Revolução Industrial e as suas consequências económicas, sociais e políticas na Europa do século XIX até à Primeira Guerra Mundial";

describe("getPresentationToolbarTitleDisplay (ENG-230)", () => {
  it("keeps the complete title as the text content, never truncated in data", () => {
    expect(getPresentationToolbarTitleDisplay(LONG_TITLE).text).toBe(LONG_TITLE);
  });

  it("exposes the full title as a hover tooltip so the visually truncated label stays recoverable", () => {
    expect(getPresentationToolbarTitleDisplay(LONG_TITLE).titleAttr).toBe(LONG_TITLE);
  });

  it("visually truncates with an ellipsis instead of letting the title grow the toolbar", () => {
    const { textClassName } = getPresentationToolbarTitleDisplay(LONG_TITLE);
    expect(textClassName.split(/\s+/)).toContain("truncate");
  });

  it("caps the title container width so a long title cannot take a full toolbar row", () => {
    const { containerClassName } = getPresentationToolbarTitleDisplay(LONG_TITLE);
    expect(containerClassName.split(/\s+/).some((c) => c.startsWith("max-w-"))).toBe(true);
  });

  it("does not add a tooltip for an empty title", () => {
    expect(getPresentationToolbarTitleDisplay("").titleAttr).toBeUndefined();
  });
});
