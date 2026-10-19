import { describe, expect, it } from "vitest";
import { getFittedTextBoxHeightPx } from "@/components/document-editor-v2/text-box-fit";

// Measured with the repo's Konva 10.3.0 (see scratch probe): a 3-line title at
// 0.036 * 960px font size, 1.3 line height, is 135px tall; the stored title
// box for a 540px-high slide is 0.17 * 540 = 91.8px.
const STORED_TITLE_BOX_PX = 91.8;
const THREE_LINE_TITLE_PX = 135;

describe("getFittedTextBoxHeightPx (ENG-231)", () => {
  it("grows a too-short stored box to fit a long wrapped title on first render", () => {
    expect(getFittedTextBoxHeightPx(STORED_TITLE_BOX_PX, () => THREE_LINE_TITLE_PX)).toBeGreaterThanOrEqual(
      THREE_LINE_TITLE_PX,
    );
  });

  it("keeps the stored height when the content already fits (layout intent preserved)", () => {
    expect(getFittedTextBoxHeightPx(STORED_TITLE_BOX_PX, () => 60)).toBe(STORED_TITLE_BOX_PX);
  });

  it("grows past the exact measured height so Konva does not drop the last line on float rounding", () => {
    // Konva keeps a line only when currentHeight + lineHeight <= maxHeight; an
    // exact-fit height (134.784) rendered 2 of 3 lines in headless Chromium.
    const needed = 134.784;
    const fitted = getFittedTextBoxHeightPx(91.8, () => needed);
    expect(fitted).toBeGreaterThan(needed);
    expect(fitted - needed).toBeLessThanOrEqual(2);
  });

  it("never shrinks a stored box that is taller than its content", () => {
    expect(getFittedTextBoxHeightPx(200, () => 0)).toBe(200);
  });
});
