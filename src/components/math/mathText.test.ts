import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { docToText, textToDoc } from "./mathText";

describe("text with formulas", () => {
  it.each([
    ["a formula in a sentence", "Calcula $\\frac{3}{4}+\\frac{1}{8}$."],
    ["money, not a formula", "custa 5$ e 3$"],
    ["a display formula", "Resolve $$x^2 = 4$$ agora"],
    ["only a formula", "$x$"],
    ["nothing", ""],
    ["bold markers", "**Atenção:** usa $\\sqrt{2}$"],
  ])("gives back %s unchanged", (_, text) => {
    expect(docToText(textToDoc(text, false))).toBe(text);
  });

  it("keeps lines in a multi-line field", () => {
    const text = "linha 1\n\nlinha 3 com $x^2$";
    expect(docToText(textToDoc(text, true))).toBe(text);
  });

  it("splits formulas out as their own pieces", () => {
    const doc = textToDoc("a $x^2$ b", false);
    const nodes = doc.content?.[0]?.content ?? [];
    expect(nodes.map((n) => n.type)).toEqual(["text", "inlineMath", "text"]);
    expect(nodes[1]?.attrs?.latex).toBe("x^2");
  });

  // The node the editor changes: the formula, second piece of the first line.
  function formulaOf(doc: JSONContent): JSONContent {
    const node = doc.content?.[0]?.content?.[1];
    if (!node) throw new Error("no formula");
    return node;
  }

  it("writes an edited formula back between single dollars", () => {
    const doc = textToDoc("Resolve $$x^2 = 4$$ agora", false);
    const math = formulaOf(doc);
    math.attrs = { ...math.attrs, latex: "x^2 = 9" };
    expect(docToText(doc)).toBe("Resolve $x^2 = 9$ agora");
  });

  it("drops an emptied formula", () => {
    const doc = textToDoc("a $x$ b", false);
    formulaOf(doc).attrs = { latex: "", raw: "$x$" };
    expect(docToText(doc)).toBe("a  b");
  });
});
