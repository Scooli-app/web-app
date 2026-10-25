import { describe, expect, it } from "vitest";
import { fromFieldTex, toFieldTex } from "./mathTex";

describe("formula blanks", () => {
  // A fill-in-the-gaps blank inside a formula is "___"; in the formula field it is an empty box.
  it("shows a blank as an empty box", () => {
    const field = toFieldTex("\\frac{___}{8}");
    expect(field).toContain("\\placeholder{}");
    expect(field).not.toContain("___");
  });

  it.each(["\\frac{___}{8}", "x^2+3x=10", "\\sqrt[3]{8}", "5\\,\\%", "___ + ___ = 10"])(
    "gives back %s unchanged when nothing was edited",
    (tex) => {
      expect(fromFieldTex(toFieldTex(tex), tex)).toBe(tex);
    },
  );

  it("ignores spacing the field adds when nothing changed", () => {
    expect(fromFieldTex("\\frac{\\placeholder{}}{ 8 }", "\\frac{___}{8}")).toBe("\\frac{___}{8}");
  });

  it("turns a box back into a blank in an edited formula", () => {
    expect(fromFieldTex("\\frac{\\placeholder{}}{9}", "\\frac{___}{8}")).toBe("\\frac{___}{9}");
  });
});
