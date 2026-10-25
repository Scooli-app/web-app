import { describe, expect, it } from "vitest";
import { pageBreaks } from "./A4Page";

describe("pageBreaks", () => {
  it("ends a page before an exercise that would cross it, as the files do", () => {
    const items = [{ top: 0, bottom: 600 }, { top: 620, bottom: 1300 }, { top: 1320, bottom: 1500 }];
    // Page 1 would end at 1000, inside the second exercise: it ends at 620 instead, and the rest fits on page 2.
    expect(pageBreaks(items, 1500, 1000)).toEqual([620]);
  });

  it("cuts an exercise taller than a page where the page ends", () => {
    expect(pageBreaks([{ top: 0, bottom: 2500 }], 2500, 1000)).toEqual([1000, 2000]);
  });

  it("has no break when everything fits on one page", () => {
    expect(pageBreaks([{ top: 0, bottom: 300 }], 300, 1000)).toEqual([]);
  });
});
